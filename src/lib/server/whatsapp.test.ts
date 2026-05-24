import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  _resetThrottleForTesting,
  sendTextMessage,
  throttleSend,
} from './whatsapp'

const INTERVAL = 50

/** Builds a minimal fetch Response stand-in with a JSON body. */
function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    headers: new Headers(),
    json: async () => body,
  } as unknown as Response
}

describe('throttleSend', () => {
  beforeEach(() => {
    _resetThrottleForTesting(INTERVAL)
  })

  it('lets the first call through immediately', async () => {
    const start = Date.now()
    await throttleSend()
    expect(Date.now() - start).toBeLessThan(INTERVAL)
  })

  it('serializes concurrent calls so each is at least INTERVAL apart', async () => {
    // Prime lastSendAt with an initial call so the next ones must wait.
    await throttleSend()

    const timestamps: number[] = []
    await Promise.all(
      [0, 1, 2].map(async () => {
        await throttleSend()
        timestamps.push(Date.now())
      })
    )

    timestamps.sort((a, b) => a - b)
    for (let i = 1; i < timestamps.length; i++) {
      // Allow a small scheduler fudge factor — setTimeout in Node can fire ~5ms early.
      expect(timestamps[i] - timestamps[i - 1]).toBeGreaterThanOrEqual(INTERVAL - 5)
    }
  })

  it('does not stall once the interval has already passed', async () => {
    await throttleSend()
    await new Promise((r) => setTimeout(r, INTERVAL + 10))
    const start = Date.now()
    await throttleSend()
    expect(Date.now() - start).toBeLessThan(INTERVAL)
  })
})

describe('send 429 backoff', () => {
  beforeEach(() => {
    // No throttle delay; allow up to 5 retries.
    _resetThrottleForTesting(0, 5)
    process.env.WASENDER_API_KEY = 'test-key'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('sends once and returns data on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { success: true }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await sendTextMessage('972500000000', 'hi')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(res).toEqual({ success: true })
  })

  it('retries after a 429 then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, { message: 'slow down', retry_after: 0 }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await sendTextMessage('972500000000', 'hi')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(res).toEqual({ success: true })
  })

  it('waits the retry_after window (seconds) before retrying', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, { retry_after: 0.04 })) // 40ms
      .mockResolvedValueOnce(jsonResponse(200, { success: true }))
    vi.stubGlobal('fetch', fetchMock)

    const start = Date.now()
    await sendTextMessage('972500000000', 'hi')
    // Allow the usual scheduler fudge factor.
    expect(Date.now() - start).toBeGreaterThanOrEqual(35)
  })

  it('gives up after the retry budget is exhausted and throws', async () => {
    _resetThrottleForTesting(0, 2)
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(429, { retry_after: 0 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(sendTextMessage('972500000000', 'hi')).rejects.toThrow(/429/)
    // initial attempt + 2 retries
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('does not retry non-429 errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(400, { message: 'bad request' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(sendTextMessage('972500000000', 'hi')).rejects.toThrow(/400/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

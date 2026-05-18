import { beforeEach, describe, expect, it } from 'vitest'
import { _resetThrottleForTesting, throttleSend } from './whatsapp'

const INTERVAL = 50

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

import { beforeEach, describe, it, expect, vi } from 'vitest'

type MockResp = { data: unknown; error: unknown }

const mocks = vi.hoisted(() => ({
  responses: {} as Record<string, MockResp[]>,
  sendInteractiveButtonMessage: vi.fn(),
}))

function createBuilder(table: string): unknown {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    is: () => builder,
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => builder,
    then: (onFulfilled: (r: MockResp) => unknown, onRejected?: (e: unknown) => unknown) => {
      const queue = mocks.responses[table]
      if (!queue?.length) {
        throw new Error(`No mock response queued for table ${table}`)
      }
      return Promise.resolve(queue.shift()!).then(onFulfilled, onRejected)
    },
  }
  return builder
}

vi.mock('./auth', () => ({
  createServiceClient: () => ({ from: (table: string) => createBuilder(table) }),
}))

vi.mock('./whatsapp', () => ({
  sendInteractiveButtonMessage: mocks.sendInteractiveButtonMessage,
}))

import {
  getCurrentTimeInTimezone,
  getTodayInTimezone,
  isWithinTolerance,
  sendMorningMessagesForNursery,
} from './morning-messages'

describe('Morning Messages - Time Helpers', () => {
  describe('isWithinTolerance', () => {
    it('should return true when times are equal', () => {
      expect(isWithinTolerance('07:30', '07:30', 5)).toBe(true)
    })

    it('should return true when within tolerance', () => {
      expect(isWithinTolerance('07:33', '07:30', 5)).toBe(true)
      expect(isWithinTolerance('07:27', '07:30', 5)).toBe(true)
    })

    it('should return true at exact boundary', () => {
      expect(isWithinTolerance('07:35', '07:30', 5)).toBe(true)
      expect(isWithinTolerance('07:25', '07:30', 5)).toBe(true)
    })

    it('should return false when outside tolerance', () => {
      expect(isWithinTolerance('07:36', '07:30', 5)).toBe(false)
      expect(isWithinTolerance('07:24', '07:30', 5)).toBe(false)
    })

    it('should handle midnight wrap', () => {
      expect(isWithinTolerance('23:58', '00:02', 5)).toBe(true)
      expect(isWithinTolerance('00:03', '23:58', 5)).toBe(true)
    })

    it('should return false for distant times across midnight', () => {
      expect(isWithinTolerance('23:00', '00:30', 5)).toBe(false)
    })
  })

  describe('getCurrentTimeInTimezone', () => {
    it('should return valid HH:MM format for Asia/Jerusalem', () => {
      const time = getCurrentTimeInTimezone('Asia/Jerusalem')
      expect(time).toMatch(/^\d{2}:\d{2}$/)
    })

    it('should return valid HH:MM format for UTC', () => {
      const time = getCurrentTimeInTimezone('UTC')
      expect(time).toMatch(/^\d{2}:\d{2}$/)
    })
  })

  describe('getTodayInTimezone', () => {
    it('should return valid YYYY-MM-DD format for Asia/Jerusalem', () => {
      const date = getTodayInTimezone('Asia/Jerusalem')
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should return valid YYYY-MM-DD format for UTC', () => {
      const date = getTodayInTimezone('UTC')
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })
})

describe('sendMorningMessagesForNursery — per-parent counting', () => {
  beforeEach(() => {
    for (const k of Object.keys(mocks.responses)) delete mocks.responses[k]
    mocks.sendInteractiveButtonMessage.mockReset()
  })

  it('counts a failed sibling send even when the other parent for the same child succeeded', async () => {
    mocks.responses.children = [
      { data: [{ id: 'c1' }], error: null },
      { data: [{ id: 'c1', name: 'Tom' }], error: null },
    ]
    mocks.responses.daily_attendance = [
      { data: [{ child_id: 'c1' }], error: null },
      { data: [{ id: 'da1', child_id: 'c1' }], error: null },
      { data: null, error: null },
    ]
    mocks.responses.children_parents = [
      {
        data: [
          { child_id: 'c1', parents: { id: 'p1', phone: '+972500000001', name: 'A' } },
          { child_id: 'c1', parents: { id: 'p2', phone: '+972500000002', name: 'B' } },
        ],
        error: null,
      },
    ]

    mocks.sendInteractiveButtonMessage.mockImplementation(async (to: string) => {
      if (to.includes('500000002')) throw new Error('rate-limited')
      return { success: true }
    })

    const result = await sendMorningMessagesForNursery('n1', '2026-05-18')

    expect(result).toEqual({ sent: 1, failed: 1 })
    expect(mocks.sendInteractiveButtonMessage).toHaveBeenCalledTimes(2)
  })

  it('returns sent=1/failed=0 when the only parent send succeeds', async () => {
    mocks.responses.children = [
      { data: [{ id: 'c1' }], error: null },
      { data: [{ id: 'c1', name: 'Tom' }], error: null },
    ]
    mocks.responses.daily_attendance = [
      { data: [{ child_id: 'c1' }], error: null },
      { data: [{ id: 'da1', child_id: 'c1' }], error: null },
      { data: null, error: null },
    ]
    mocks.responses.children_parents = [
      {
        data: [{ child_id: 'c1', parents: { id: 'p1', phone: '+972500000001', name: 'A' } }],
        error: null,
      },
    ]

    mocks.sendInteractiveButtonMessage.mockResolvedValue({ success: true })

    const result = await sendMorningMessagesForNursery('n1', '2026-05-18')

    expect(result).toEqual({ sent: 1, failed: 0 })
  })

  it('returns sent=0/failed=1 when the only parent send fails', async () => {
    mocks.responses.children = [
      { data: [{ id: 'c1' }], error: null },
      { data: [{ id: 'c1', name: 'Tom' }], error: null },
    ]
    mocks.responses.daily_attendance = [
      { data: [{ child_id: 'c1' }], error: null },
      { data: [{ id: 'da1', child_id: 'c1' }], error: null },
    ]
    mocks.responses.children_parents = [
      {
        data: [{ child_id: 'c1', parents: { id: 'p1', phone: '+972500000001', name: 'A' } }],
        error: null,
      },
    ]

    mocks.sendInteractiveButtonMessage.mockRejectedValue(new Error('rate-limited'))

    const result = await sendMorningMessagesForNursery('n1', '2026-05-18')

    expect(result).toEqual({ sent: 0, failed: 1 })
  })
})

import { beforeEach, describe, it, expect, vi } from 'vitest'

type MockResp = { data: unknown; error: unknown }

const mocks = vi.hoisted(() => ({
  responses: {} as Record<string, MockResp[]>,
  sendInteractiveButtonMessage: vi.fn(),
  sendTextMessage: vi.fn(),
}))

function createBuilder(table: string): unknown {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    insert: () => builder,
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

vi.mock('./morning-messages', () => ({
  getCurrentTimeInTimezone: () => '09:00',
  getTodayInTimezone: () => '2026-05-25',
  isWithinTolerance: () => true,
}))

vi.mock('./whatsapp', () => ({
  sendInteractiveButtonMessage: mocks.sendInteractiveButtonMessage,
  sendTextMessage: mocks.sendTextMessage,
}))

import { runNineAmCheck } from './nine-am-check'

function pollButtonTitles(): string[] {
  const call = mocks.sendInteractiveButtonMessage.mock.calls[0]
  const buttons = call[2] as { id: string; title: string }[]
  return buttons.map((b) => b.title)
}

describe('runNineAmCheck — teacher poll membership', () => {
  beforeEach(() => {
    for (const k of Object.keys(mocks.responses)) delete mocks.responses[k]
    mocks.sendInteractiveButtonMessage.mockReset()
    mocks.sendInteractiveButtonMessage.mockResolvedValue({ success: true })
    mocks.sendTextMessage.mockReset()
    mocks.sendTextMessage.mockResolvedValue({ success: true })
  })

  it('includes a late-arrival child in the poll alongside on-time children', async () => {
    mocks.responses.nurseries = [
      { data: [{ id: 'n1', name: 'גן שקד', timezone: 'Asia/Jerusalem', teacher_poll_time: '09:00' }], error: null },
    ]
    mocks.responses.teacher_poll_runs = [
      { data: null, error: null }, // insert (idempotency guard) succeeds
      { data: null, error: null }, // closing update
    ]
    mocks.responses.children = [
      {
        data: [
          { id: 'c1', name: 'נטע' },
          { id: 'c2', name: 'לביא' },
          { id: 'c3', name: 'אסיף' },
        ],
        error: null,
      },
    ]
    mocks.responses.daily_attendance = [
      {
        data: [
          { child_id: 'c1', parent_response: 'dropping_off', message_sent_at: '2026-05-25T05:00:00Z' },
          { child_id: 'c2', parent_response: 'dropping_off_late', message_sent_at: '2026-05-25T05:00:00Z' },
          { child_id: 'c3', parent_response: 'not_today', message_sent_at: '2026-05-25T05:00:00Z' },
        ],
        error: null,
      },
    ]
    mocks.responses.teachers = [{ data: [{ phone: '+972500000099' }], error: null }]

    const result = await runNineAmCheck()

    expect(result).toEqual({ nurseriesProcessed: 1, pollsSent: 1 })
    expect(mocks.sendInteractiveButtonMessage).toHaveBeenCalledTimes(1)

    const titles = pollButtonTitles()
    expect(titles).toContain('נטע') // on time
    expect(titles).toContain('לביא') // late — previously dropped (the bug)
    expect(titles).not.toContain('אסיף') // not coming
  })

  it('still pads a lone late child so WASender accepts the poll', async () => {
    mocks.responses.nurseries = [
      { data: [{ id: 'n1', name: 'גן שקד', timezone: 'Asia/Jerusalem', teacher_poll_time: '09:00' }], error: null },
    ]
    mocks.responses.teacher_poll_runs = [
      { data: null, error: null },
      { data: null, error: null },
    ]
    mocks.responses.children = [{ data: [{ id: 'c2', name: 'לביא' }], error: null }]
    mocks.responses.daily_attendance = [
      {
        data: [
          { child_id: 'c2', parent_response: 'dropping_off_late', message_sent_at: '2026-05-25T05:00:00Z' },
        ],
        error: null,
      },
    ]
    mocks.responses.teachers = [{ data: [{ phone: '+972500000099' }], error: null }]

    const result = await runNineAmCheck()

    expect(result).toEqual({ nurseriesProcessed: 1, pollsSent: 1 })
    const titles = pollButtonTitles()
    expect(titles).toContain('לביא')
    expect(titles).toHaveLength(2) // real child + padding sentinel
  })
})

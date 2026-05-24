import { beforeEach, describe, it, expect, vi } from 'vitest'

type MockResp = { data: unknown; error: unknown }

const mocks = vi.hoisted(() => ({
  responses: {} as Record<string, MockResp[]>,
  updates: [] as Array<{ table: string; payload: Record<string, unknown> }>,
  sendInteractiveButtonMessage: vi.fn(),
}))

function createBuilder(table: string): unknown {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    is: () => builder,
    not: () => builder,
    update: (payload: Record<string, unknown>) => {
      mocks.updates.push({ table, payload })
      return builder
    },
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

import { sendSecondPingForNursery } from './second-ping'

const PARENT = { id: 'p1', phone: '+972500000001', name: 'A' }

describe('sendSecondPingForNursery — unsent-family safety net', () => {
  beforeEach(() => {
    for (const k of Object.keys(mocks.responses)) delete mocks.responses[k]
    mocks.updates.length = 0
    mocks.sendInteractiveButtonMessage.mockReset()
    mocks.sendInteractiveButtonMessage.mockResolvedValue({ success: true })
  })

  it('pings a family whose morning message never sent and backfills message_sent_at', async () => {
    mocks.responses.children = [{ data: [{ id: 'c1', name: 'Tom' }], error: null }]
    mocks.responses.daily_attendance = [
      { data: [{ id: 'da1', child_id: 'c1', message_sent_at: null }], error: null }, // unresponded select
      { data: null, error: null }, // update resolve
    ]
    mocks.responses.children_parents = [
      { data: [{ child_id: 'c1', parents: PARENT }], error: null },
    ]

    const result = await sendSecondPingForNursery('n1', '2026-05-24')

    expect(result).toEqual({ sent: 1, failed: 0 })
    expect(mocks.sendInteractiveButtonMessage).toHaveBeenCalledTimes(1)
    expect(mocks.sendInteractiveButtonMessage.mock.calls[0][0]).toBe('972500000001')

    const update = mocks.updates.find((u) => u.table === 'daily_attendance')
    expect(update?.payload).toHaveProperty('second_ping_sent_at')
    expect(update?.payload).toHaveProperty('message_sent_at')
  })

  it('does not overwrite message_sent_at for a family that already got the morning message', async () => {
    mocks.responses.children = [{ data: [{ id: 'c1', name: 'Tom' }], error: null }]
    mocks.responses.daily_attendance = [
      {
        data: [{ id: 'da1', child_id: 'c1', message_sent_at: '2026-05-24T04:00:00Z' }],
        error: null,
      },
      { data: null, error: null },
    ]
    mocks.responses.children_parents = [
      { data: [{ child_id: 'c1', parents: PARENT }], error: null },
    ]

    const result = await sendSecondPingForNursery('n1', '2026-05-24')

    expect(result).toEqual({ sent: 1, failed: 0 })
    const update = mocks.updates.find((u) => u.table === 'daily_attendance')
    expect(update?.payload).toHaveProperty('second_ping_sent_at')
    expect(update?.payload).not.toHaveProperty('message_sent_at')
  })

  it('counts a failure and writes no update when the send fails', async () => {
    mocks.sendInteractiveButtonMessage.mockReset()
    mocks.sendInteractiveButtonMessage.mockRejectedValue(new Error('rate-limited'))
    mocks.responses.children = [{ data: [{ id: 'c1', name: 'Tom' }], error: null }]
    mocks.responses.daily_attendance = [
      { data: [{ id: 'da1', child_id: 'c1', message_sent_at: null }], error: null },
    ]
    mocks.responses.children_parents = [
      { data: [{ child_id: 'c1', parents: PARENT }], error: null },
    ]

    const result = await sendSecondPingForNursery('n1', '2026-05-24')

    expect(result).toEqual({ sent: 0, failed: 1 })
    expect(mocks.updates).toHaveLength(0)
  })
})

/**
 * Second ping: reminder message for parents who didn't respond to the morning check-in.
 *
 * Fires 30 minutes after `first_message_time`. Targets attendance records where
 * message was sent but parent hasn't responded yet.
 */

import { createServiceClient } from './auth'
import {
  getCurrentTimeInTimezone,
  getTodayInTimezone,
  isWithinTolerance,
  addMinutesToTime,
} from './morning-messages'
import { secondPingMessage } from './message-templates'
import { toWhatsAppPhone } from './phone-utils'
import { sendInteractiveButtonMessage } from './whatsapp'

export async function sendSecondPingForNursery(
  nurseryId: string,
  date: string
): Promise<{ sent: number; failed: number }> {
  const supabase = createServiceClient()
  let sent = 0
  let failed = 0

  // Get children in this nursery
  const { data: children } = await supabase
    .from('children')
    .select('id, name')
    .eq('nursery_id', nurseryId)
  if (!children?.length) return { sent, failed }

  const childIds = children.map((c) => c.id)
  const childNameMap = new Map(children.map((c) => [c.id, c.name]))

  // Find attendance records with no response and no second ping yet. Records
  // whose morning message never sent (message_sent_at null) are intentionally
  // included: those families were missed entirely by the first send, so this
  // reminder is their first — and only — contact for the day.
  const { data: unresponded } = await supabase
    .from('daily_attendance')
    .select('id, child_id, message_sent_at')
    .eq('date', date)
    .in('child_id', childIds)
    .is('parent_response', null)
    .is('second_ping_sent_at', null)
  if (!unresponded?.length) return { sent, failed }

  // Batch-fetch child→parent links
  const unrespondedChildIds = unresponded.map((r) => r.child_id)
  const { data: parentLinks } = await supabase
    .from('children_parents')
    .select('child_id, parents(id, phone, name)')
    .in('child_id', unrespondedChildIds)

  type ParentInfo = { id: string; phone: string; name: string }
  const childParentsMap = new Map<string, ParentInfo[]>()
  for (const link of parentLinks ?? []) {
    const parent = link.parents as unknown as ParentInfo | null
    if (!parent?.phone) continue
    const list = childParentsMap.get(link.child_id) ?? []
    list.push(parent)
    childParentsMap.set(link.child_id, list)
  }

  for (const record of unresponded) {
    const parents = childParentsMap.get(record.child_id)
    const childName = childNameMap.get(record.child_id) ?? ''

    if (!parents?.length) continue

    let anySendSucceeded = false
    for (const parent of parents) {
      try {
        const msg = secondPingMessage(childName, record.id)
        await sendInteractiveButtonMessage(
          toWhatsAppPhone(parent.phone),
          msg.text,
          msg.buttons!
        )
        anySendSucceeded = true
      } catch (err) {
        console.error(
          `[Second Ping] Failed to send to ${parent.phone} for child ${record.child_id}:`,
          err
        )
      }
    }

    if (anySendSucceeded) {
      const now = new Date().toISOString()
      const update: { second_ping_sent_at: string; message_sent_at?: string } = {
        second_ping_sent_at: now,
      }
      // Backfill message_sent_at when the morning message never went out, so the
      // 9am no-response check (which requires message_sent_at) can still escalate
      // this family to the teacher if they don't answer the reminder either.
      if (record.message_sent_at == null) update.message_sent_at = now
      await supabase.from('daily_attendance').update(update).eq('id', record.id)
      sent++
    } else {
      failed++
    }
  }

  return { sent, failed }
}

export async function runSecondPing(toleranceMinutes = 5): Promise<{
  nurseriesProcessed: number
  totalSent: number
  totalFailed: number
}> {
  const supabase = createServiceClient()
  let nurseriesProcessed = 0
  let totalSent = 0
  let totalFailed = 0

  const { data: nurseries } = await supabase
    .from('nurseries')
    .select('id, first_message_time, timezone')
  if (!nurseries?.length) return { nurseriesProcessed, totalSent, totalFailed }

  for (const nursery of nurseries) {
    const tz = nursery.timezone ?? 'Asia/Jerusalem'
    const currentTime = getCurrentTimeInTimezone(tz)
    const today = getTodayInTimezone(tz)
    const secondPingTime = addMinutesToTime(nursery.first_message_time, 30)

    if (!isWithinTolerance(currentTime, secondPingTime, toleranceMinutes)) {
      continue
    }

    const result = await sendSecondPingForNursery(nursery.id, today)
    nurseriesProcessed++
    totalSent += result.sent
    totalFailed += result.failed
  }

  return { nurseriesProcessed, totalSent, totalFailed }
}

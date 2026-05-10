/**
 * Teacher follow-up (9:30am): send parent messages for unaccounted children,
 * then send teacher an FYI listing them.
 *
 * Two groups are processed:
 *   1. Expected (dropping_off) children not confirmed by teacher
 *   2. Children whose parents never responded to the morning message
 */

import { createServiceClient } from './auth'
import {
  getCurrentTimeInTimezone,
  getTodayInTimezone,
  isWithinTolerance,
  addMinutesToTime,
} from './morning-messages'
import {
  parentUnconfirmedFollowupMessage,
  parentNoResponseFollowupMessage,
  teacherFollowupFYIMessage,
} from './message-templates'
import { toWhatsAppPhone } from './phone-utils'
import { sendTextMessage, sendInteractiveButtonMessage } from './whatsapp'

export async function runTeacherFollowup(toleranceMinutes = 5): Promise<{
  nurseriesProcessed: number
  parentFollowupsSent: number
  teacherFIYsSent: number
}> {
  const supabase = createServiceClient()
  let nurseriesProcessed = 0
  let parentFollowupsSent = 0
  let teacherFIYsSent = 0

  const { data: nurseries } = await supabase
    .from('nurseries')
    .select('id, name, timezone, teacher_poll_time')
  if (!nurseries?.length) return { nurseriesProcessed, parentFollowupsSent, teacherFIYsSent }

  for (const nursery of nurseries) {
    const tz = nursery.timezone ?? 'Asia/Jerusalem'
    const currentTime = getCurrentTimeInTimezone(tz)
    const today = getTodayInTimezone(tz)
    const followupTime = addMinutesToTime(nursery.teacher_poll_time, 30)

    if (!isWithinTolerance(currentTime, followupTime, toleranceMinutes)) {
      continue
    }

    const { data: children } = await supabase
      .from('children')
      .select('id, name')
      .eq('nursery_id', nursery.id)
    if (!children?.length) continue

    const childIds = children.map((c) => c.id)
    const childNameMap = new Map(children.map((c) => [c.id, c.name]))

    const { data: attendance } = await supabase
      .from('daily_attendance')
      .select('id, child_id, parent_response, teacher_confirmed, parent_followup_sent')
      .eq('date', today)
      .in('child_id', childIds)
      .eq('parent_followup_sent', false)
    if (!attendance?.length) {
      nurseriesProcessed++
      continue
    }

    // Split into the two groups that need follow-up
    const unconfirmedExpected = attendance.filter(
      (a) => a.parent_response === 'dropping_off' && !a.teacher_confirmed
    )
    const noResponse = attendance.filter((a) => a.parent_response === null)

    if (unconfirmedExpected.length === 0 && noResponse.length === 0) {
      nurseriesProcessed++
      continue
    }

    // Batch-fetch parent phones for all children needing follow-up
    const followupChildIds = [
      ...unconfirmedExpected.map((a) => a.child_id),
      ...noResponse.map((a) => a.child_id),
    ]

    const { data: parentLinks } = await supabase
      .from('children_parents')
      .select('child_id, parents(id, phone)')
      .in('child_id', followupChildIds)

    type ParentRow = { id: string; phone: string }
    const childParentsMap = new Map<string, ParentRow[]>()
    for (const link of parentLinks ?? []) {
      const parent = link.parents as unknown as ParentRow | null
      if (!parent?.phone) continue
      const list = childParentsMap.get(link.child_id) ?? []
      list.push(parent)
      childParentsMap.set(link.child_id, list)
    }

    const processedIds: string[] = []

    // Group 1: expected but not confirmed → buttons (reuses ninealert webhook handlers)
    for (const record of unconfirmedExpected) {
      const childName = childNameMap.get(record.child_id) ?? ''
      const parents = childParentsMap.get(record.child_id) ?? []
      const msg = parentUnconfirmedFollowupMessage(childName, nursery.name, record.id)

      for (const parent of parents) {
        try {
          await sendInteractiveButtonMessage(
            toWhatsAppPhone(parent.phone),
            msg.text,
            msg.buttons!
          )
          parentFollowupsSent++
        } catch (err) {
          console.error(`[FollowUp] Failed to send to ${parent.phone}:`, err)
        }
      }
      processedIds.push(record.id)
    }

    // Group 2: no parent response → plain text
    for (const record of noResponse) {
      const childName = childNameMap.get(record.child_id) ?? ''
      const parents = childParentsMap.get(record.child_id) ?? []
      const msg = parentNoResponseFollowupMessage(childName, nursery.name)

      for (const parent of parents) {
        try {
          await sendTextMessage(toWhatsAppPhone(parent.phone), msg.text)
          parentFollowupsSent++
        } catch (err) {
          console.error(`[FollowUp] Failed to send to ${parent.phone}:`, err)
        }
      }
      processedIds.push(record.id)
    }

    // Mark all processed records so the cron doesn't re-send
    if (processedIds.length > 0) {
      await supabase
        .from('daily_attendance')
        .update({ parent_followup_sent: true })
        .in('id', processedIds)
    }

    // Teacher FYI
    const unconfirmedNames = unconfirmedExpected.map((a) => childNameMap.get(a.child_id) ?? '')
    const noResponseList = noResponse.map((a) => {
      const name = childNameMap.get(a.child_id) ?? ''
      const parents = childParentsMap.get(a.child_id) ?? []
      const phone = parents[0]?.phone ?? ''
      return { name, parentPhone: phone }
    })

    if (unconfirmedNames.length > 0 || noResponseList.length > 0) {
      const fiy = teacherFollowupFYIMessage(unconfirmedNames, noResponseList)
      const { data: teachers } = await supabase
        .from('teachers')
        .select('phone')
        .eq('nursery_id', nursery.id)

      for (const teacher of teachers ?? []) {
        try {
          await sendTextMessage(toWhatsAppPhone(teacher.phone), fiy.text)
          teacherFIYsSent++
        } catch (err) {
          console.error(`[FollowUp] Failed to send FYI to teacher ${teacher.phone}:`, err)
        }
      }
    }

    nurseriesProcessed++
  }

  return { nurseriesProcessed, parentFollowupsSent, teacherFIYsSent }
}

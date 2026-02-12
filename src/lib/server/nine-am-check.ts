/**
 * 9am check: teacher summary + unconfirmed arrival alerts.
 *
 * Part A: Send consolidated attendance summary to each teacher.
 * Part B: Send alerts to parents whose child was marked "dropping_off"
 *         but hasn't been confirmed by a teacher yet.
 */

import { createServiceClient } from './auth'
import {
  getCurrentTimeInTimezone,
  getTodayInTimezone,
  isWithinTolerance,
} from './morning-messages'
import {
  teacherSummaryMessage,
  nineAmAlertMessage,
} from './message-templates'
import { toWhatsAppPhone } from './phone-utils'
import {
  sendTextMessage,
  sendInteractiveButtonMessage,
} from './whatsapp'

export async function runNineAmCheck(toleranceMinutes = 5): Promise<{
  nurseriesProcessed: number
  summariesSent: number
  alertsSent: number
}> {
  const supabase = createServiceClient()
  let nurseriesProcessed = 0
  let summariesSent = 0
  let alertsSent = 0

  const { data: nurseries } = await supabase
    .from('nurseries')
    .select('id, name, timezone, nine_am_check_time')
  if (!nurseries?.length) return { nurseriesProcessed, summariesSent, alertsSent }

  for (const nursery of nurseries) {
    const tz = nursery.timezone ?? 'Asia/Jerusalem'
    const currentTime = getCurrentTimeInTimezone(tz)
    const today = getTodayInTimezone(tz)

    if (!isWithinTolerance(currentTime, nursery.nine_am_check_time, toleranceMinutes)) {
      continue
    }

    // Get all children in nursery
    const { data: children } = await supabase
      .from('children')
      .select('id, name')
      .eq('nursery_id', nursery.id)
    if (!children?.length) continue

    const childIds = children.map((c) => c.id)
    const childNameMap = new Map(children.map((c) => [c.id, c.name]))

    // Get today's attendance
    const { data: attendance } = await supabase
      .from('daily_attendance')
      .select('id, child_id, parent_response, parent_explanation, teacher_confirmed, nine_am_alert_sent')
      .eq('date', today)
      .in('child_id', childIds)
    if (!attendance) continue

    // Build attendance map by child_id
    const attendanceMap = new Map(attendance.map((a) => [a.child_id, a]))

    // -----------------------------------------------------------------------
    // Part A: Teacher summary
    // -----------------------------------------------------------------------

    const expected: string[] = []
    const notComing: Array<{ name: string; explanation?: string }> = []
    const noResponse: Array<{ name: string; parentPhone: string }> = []

    // We need parent phones for no-response list
    const { data: parentLinks } = await supabase
      .from('children_parents')
      .select('child_id, parents(phone)')
      .in('child_id', childIds)

    type ParentPhoneRow = { phone: string }
    const childFirstParentPhone = new Map<string, string>()
    for (const link of parentLinks ?? []) {
      if (!childFirstParentPhone.has(link.child_id)) {
        const p = link.parents as unknown as ParentPhoneRow | null
        if (p?.phone) childFirstParentPhone.set(link.child_id, p.phone)
      }
    }

    for (const child of children) {
      const record = attendanceMap.get(child.id)
      if (!record || !record.parent_response) {
        noResponse.push({
          name: child.name,
          parentPhone: childFirstParentPhone.get(child.id) ?? '',
        })
      } else if (record.parent_response === 'dropping_off') {
        expected.push(child.name)
      } else {
        notComing.push({
          name: child.name,
          explanation: record.parent_explanation ?? undefined,
        })
      }
    }

    // Format date as DD/MM/YYYY
    const [y, m, d] = today.split('-')
    const formattedDate = `${d}/${m}/${y}`

    const summary = teacherSummaryMessage(
      nursery.name,
      formattedDate,
      expected,
      notComing,
      noResponse
    )

    // Send to all teachers in this nursery
    const { data: teachers } = await supabase
      .from('teachers')
      .select('phone')
      .eq('nursery_id', nursery.id)

    for (const teacher of teachers ?? []) {
      try {
        await sendTextMessage(toWhatsAppPhone(teacher.phone), summary.text)
        summariesSent++
      } catch (err) {
        console.error(`[9am] Failed to send summary to ${teacher.phone}:`, err)
      }
    }

    // -----------------------------------------------------------------------
    // Part B: Unconfirmed arrival alerts
    // -----------------------------------------------------------------------

    const unconfirmed = attendance.filter(
      (a) =>
        a.parent_response === 'dropping_off' &&
        !a.teacher_confirmed &&
        !a.nine_am_alert_sent
    )

    for (const record of unconfirmed) {
      const childName = childNameMap.get(record.child_id) ?? ''

      // Get parents for this child
      const { data: childParentLinks } = await supabase
        .from('children_parents')
        .select('parents(phone)')
        .eq('child_id', record.child_id)

      for (const link of childParentLinks ?? []) {
        const parent = link.parents as unknown as { phone: string } | null
        if (!parent?.phone) continue

        try {
          const msg = nineAmAlertMessage(childName, nursery.name, record.id)
          await sendInteractiveButtonMessage(
            toWhatsAppPhone(parent.phone),
            msg.text,
            msg.buttons!
          )
          alertsSent++
        } catch (err) {
          console.error(`[9am] Failed to send alert to ${parent.phone}:`, err)
        }
      }

      // Mark alert as sent
      await supabase
        .from('daily_attendance')
        .update({ nine_am_alert_sent: true })
        .eq('id', record.id)
    }

    nurseriesProcessed++
  }

  return { nurseriesProcessed, summariesSent, alertsSent }
}

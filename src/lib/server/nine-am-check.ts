/**
 * 9am check: send teacher an attendance poll listing expected children.
 *
 * Teachers tap each child who has physically arrived. Follow-up messages
 * to parents are handled separately by the teacher-followup cron at 9:30am.
 */

import { createServiceClient } from './auth'
import {
  getCurrentTimeInTimezone,
  getTodayInTimezone,
  isWithinTolerance,
} from './morning-messages'
import { teacherPollMessage, teacherNoResponseSummaryMessage } from './message-templates'
import { toWhatsAppPhone } from './phone-utils'
import { sendInteractiveButtonMessage, sendTextMessage } from './whatsapp'

export async function runNineAmCheck(toleranceMinutes = 5): Promise<{
  nurseriesProcessed: number
  pollsSent: number
}> {
  const supabase = createServiceClient()
  let nurseriesProcessed = 0
  let pollsSent = 0

  const { data: nurseries } = await supabase
    .from('nurseries')
    .select('id, name, timezone, teacher_poll_time')
  if (!nurseries?.length) return { nurseriesProcessed, pollsSent }

  for (const nursery of nurseries) {
    const tz = nursery.timezone ?? 'Asia/Jerusalem'
    const currentTime = getCurrentTimeInTimezone(tz)
    const today = getTodayInTimezone(tz)

    if (!isWithinTolerance(currentTime, nursery.teacher_poll_time, toleranceMinutes)) {
      continue
    }

    // Prevent duplicate polls if cron fires multiple times in the tolerance window
    const { error: runInsertErr } = await supabase
      .from('teacher_poll_runs')
      .insert({ nursery_id: nursery.id, run_date: today })
    if (runInsertErr) {
      console.log(`[9am] Poll already sent for nursery ${nursery.id} on ${today}`)
      continue
    }

    const { data: children } = await supabase
      .from('children')
      .select('id, name')
      .eq('nursery_id', nursery.id)
    if (!children?.length) continue

    const childIds = children.map((c) => c.id)

    const { data: attendance } = await supabase
      .from('daily_attendance')
      .select('child_id, parent_response, message_sent_at')
      .eq('date', today)
      .in('child_id', childIds)
    if (!attendance) continue

    const attendanceMap = new Map(attendance.map((a) => [a.child_id, a]))

    // Only on-time expected children appear in the teacher poll
    const expectedNames = children
      .filter((c) => attendanceMap.get(c.id)?.parent_response === 'dropping_off')
      .map((c) => c.name)

    const { data: teachers } = await supabase
      .from('teachers')
      .select('phone')
      .eq('nursery_id', nursery.id)

    if (expectedNames.length === 0) {
      // No confirmed arrivals — send teachers an FYI for any parents who haven't responded
      const noResponseNames = children
        .filter((c) => {
          const rec = attendanceMap.get(c.id)
          return rec?.message_sent_at != null && rec?.parent_response == null
        })
        .map((c) => c.name)

      let nurserySent = 0
      if (noResponseNames.length > 0) {
        const msg = teacherNoResponseSummaryMessage(noResponseNames)
        for (const teacher of teachers ?? []) {
          try {
            await sendTextMessage(toWhatsAppPhone(teacher.phone), msg.text)
            nurserySent++
          } catch (err) {
            console.error(`[9am] Failed to send no-response FYI to ${teacher.phone}:`, err)
          }
        }
      }

      await supabase
        .from('teacher_poll_runs')
        .update({ polls_sent: nurserySent, completed_at: new Date().toISOString() })
        .eq('nursery_id', nursery.id)
        .eq('run_date', today)

      nurseriesProcessed++
      pollsSent += nurserySent
      continue
    }

    const [y, m, d] = today.split('-')
    const formattedDate = `${d}/${m}/${y}`

    // WASenderAPI polls support up to 12 options — chunk into multiple polls if needed
    const chunks: string[][] = []
    for (let i = 0; i < expectedNames.length; i += 12) {
      chunks.push(expectedNames.slice(i, i + 12))
    }

    let nurserySent = 0
    for (const teacher of teachers ?? []) {
      for (let i = 0; i < chunks.length; i++) {
        const part = chunks.length > 1 ? `${i + 1}/${chunks.length}` : undefined
        const msg = teacherPollMessage(nursery.name, formattedDate, chunks[i], part)
        try {
          await sendInteractiveButtonMessage(
            toWhatsAppPhone(teacher.phone),
            msg.text,
            msg.buttons!,
            true
          )
          nurserySent++
        } catch (err) {
          console.error(`[9am] Failed to send poll to ${teacher.phone}:`, err)
        }
      }
    }

    await supabase
      .from('teacher_poll_runs')
      .update({ polls_sent: nurserySent, completed_at: new Date().toISOString() })
      .eq('nursery_id', nursery.id)
      .eq('run_date', today)

    nurseriesProcessed++
    pollsSent += nurserySent
  }

  return { nurseriesProcessed, pollsSent }
}

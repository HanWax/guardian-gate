import { createServiceClient } from './auth'
import { toWhatsAppPhone } from './phone-utils'
import { sendInteractiveButtonMessage } from './whatsapp'

/**
 * Returns current time as "HH:MM" in the given timezone.
 */
export function getCurrentTimeInTimezone(tz: string): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return formatter.format(new Date())
}

/**
 * Returns today's date as "YYYY-MM-DD" in the given timezone.
 */
export function getTodayInTimezone(tz: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date())
}

/**
 * Checks if `current` time (HH:MM) is within `minutes` of `target` time (HH:MM).
 */
export function isWithinTolerance(
  current: string,
  target: string,
  minutes: number
): boolean {
  const [curH, curM] = current.split(':').map(Number)
  const [tarH, tarM] = target.split(':').map(Number)
  const curTotal = curH * 60 + curM
  const tarTotal = tarH * 60 + tarM
  const diff = Math.abs(curTotal - tarTotal)
  // Handle midnight wrap (e.g., 23:55 vs 00:05)
  return Math.min(diff, 1440 - diff) <= minutes
}

/**
 * Sends morning check-in messages for a single nursery.
 * Returns counts of sent/failed messages.
 */
export async function sendMorningMessagesForNursery(
  nurseryId: string,
  date: string
): Promise<{ sent: number; failed: number }> {
  const supabase = createServiceClient()
  let sent = 0
  let failed = 0

  // 1. Get all children in this nursery
  const { data: children, error: childErr } = await supabase
    .from('children')
    .select('id')
    .eq('nursery_id', nurseryId)
  if (childErr || !children?.length) return { sent, failed }

  const childIds = children.map((c) => c.id)

  // 2. Ensure daily_attendance records exist for today
  const { data: existing } = await supabase
    .from('daily_attendance')
    .select('child_id')
    .eq('date', date)
    .in('child_id', childIds)

  const existingIds = new Set((existing ?? []).map((r) => r.child_id))
  const missing = childIds.filter((id) => !existingIds.has(id))

  if (missing.length > 0) {
    const rows = missing.map((child_id) => ({ child_id, date }))
    await supabase.from('daily_attendance').insert(rows)
  }

  // 3. Get attendance records where message not yet sent
  const { data: unsent, error: unsentErr } = await supabase
    .from('daily_attendance')
    .select('id, child_id')
    .eq('date', date)
    .in('child_id', childIds)
    .is('message_sent_at', null)
  if (unsentErr || !unsent?.length) return { sent, failed }

  // 4. Batch-fetch child→parent links with parent info and child names
  const unsentChildIds = unsent.map((r) => r.child_id)

  const [parentLinksResult, childNamesResult] = await Promise.all([
    supabase
      .from('children_parents')
      .select('child_id, parents(id, phone, name)')
      .in('child_id', unsentChildIds),
    supabase
      .from('children')
      .select('id, name')
      .in('id', unsentChildIds),
  ])

  const parentLinks = parentLinksResult.data ?? []
  const childNames = childNamesResult.data ?? []

  // Build lookup maps
  const childNameMap = new Map(childNames.map((c) => [c.id, c.name]))

  type ParentInfo = { id: string; phone: string; name: string }
  const childParentsMap = new Map<string, ParentInfo[]>()
  for (const link of parentLinks) {
    const parent = link.parents as unknown as ParentInfo | null
    if (!parent?.phone) continue
    const list = childParentsMap.get(link.child_id) ?? []
    list.push(parent)
    childParentsMap.set(link.child_id, list)
  }

  // 5. Send messages for each unsent record
  for (const record of unsent) {
    const parents = childParentsMap.get(record.child_id)
    const childName = childNameMap.get(record.child_id) ?? ''

    if (!parents?.length) {
      // No parents linked — mark as sent to avoid retrying
      await supabase
        .from('daily_attendance')
        .update({ message_sent_at: new Date().toISOString() })
        .eq('id', record.id)
      continue
    }

    let anySendSucceeded = false
    for (const parent of parents) {
      try {
        const bodyText = `בוקר טוב ${parent.name}! האם ${childName} מגיע/ה היום לגן?`
        await sendInteractiveButtonMessage(
          toWhatsAppPhone(parent.phone),
          bodyText,
          [
            { id: `checkin_yes_${record.id}`, title: '\u2713 בדרך לגן' },
            { id: `checkin_no_${record.id}`, title: '\u2717 לא היום' },
          ]
        )
        anySendSucceeded = true
      } catch (err) {
        console.error(
          `[Morning Messages] Failed to send to ${parent.phone} for child ${record.child_id}:`,
          err
        )
      }
    }

    if (anySendSucceeded) {
      await supabase
        .from('daily_attendance')
        .update({ message_sent_at: new Date().toISOString() })
        .eq('id', record.id)
      sent++
    } else {
      failed++
    }
  }

  return { sent, failed }
}

/**
 * Orchestrator: checks all nurseries and sends morning messages
 * for those whose current time is within tolerance of first_message_time.
 */
export async function runMorningMessages(toleranceMinutes = 5): Promise<{
  nurseriesProcessed: number
  totalSent: number
  totalFailed: number
}> {
  const supabase = createServiceClient()
  let nurseriesProcessed = 0
  let totalSent = 0
  let totalFailed = 0

  // 1. Fetch all nurseries with scheduling info
  const { data: nurseries, error } = await supabase
    .from('nurseries')
    .select('id, first_message_time, timezone')
  if (error || !nurseries?.length) return { nurseriesProcessed, totalSent, totalFailed }

  for (const nursery of nurseries) {
    const tz = nursery.timezone ?? 'Asia/Jerusalem'
    const currentTime = getCurrentTimeInTimezone(tz)
    const today = getTodayInTimezone(tz)

    // 2. Check if current time is within tolerance of first_message_time
    if (!isWithinTolerance(currentTime, nursery.first_message_time, toleranceMinutes)) {
      continue
    }

    // 3. Check for existing completed run today
    const { data: existingRun } = await supabase
      .from('morning_message_runs')
      .select('id, status')
      .eq('nursery_id', nursery.id)
      .eq('run_date', today)
      .single()

    if (existingRun?.status === 'completed') continue

    // 4. Insert running record (UNIQUE constraint prevents duplicates)
    const { data: run, error: insertErr } = await supabase
      .from('morning_message_runs')
      .insert({ nursery_id: nursery.id, run_date: today })
      .select('id')
      .single()

    if (insertErr) {
      // Duplicate — another process already started
      console.log(`[Morning Messages] Run already exists for nursery ${nursery.id} on ${today}`)
      continue
    }

    // 5. Send messages
    try {
      const result = await sendMorningMessagesForNursery(nursery.id, today)

      await supabase
        .from('morning_message_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          messages_sent: result.sent,
          messages_failed: result.failed,
        })
        .eq('id', run.id)

      nurseriesProcessed++
      totalSent += result.sent
      totalFailed += result.failed
    } catch (err) {
      await supabase
        .from('morning_message_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_details: err instanceof Error ? err.message : String(err),
        })
        .eq('id', run.id)

      console.error(`[Morning Messages] Failed for nursery ${nursery.id}:`, err)
    }
  }

  return { nurseriesProcessed, totalSent, totalFailed }
}

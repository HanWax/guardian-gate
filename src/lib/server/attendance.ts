import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createServiceClient, requireAuth, requireManagerRole, resolveNurseryId } from './auth'

const err = {
  fetch_failed: 'שגיאה בטעינת נתוני נוכחות. אנא נסה שוב',
  ensure_failed: 'שגיאה ביצירת רשומות נוכחות. אנא נסה שוב',
} as const

const tokenSchema = z.object({ accessToken: z.string().min(1) })

export const getAttendanceByDate = createServerFn({ method: 'GET' })
  .inputValidator(tokenSchema.extend({ date: z.string().min(1) }))
  .handler(async ({ data }) => {
    const user = await requireManagerRole(data.accessToken)
    const { role } = await requireAuth(data.accessToken)
    const nurseryId = await resolveNurseryId(user, role)

    const supabase = createServiceClient()
    let query = supabase
      .from('daily_attendance')
      .select('*, children(name, nursery_id)')
      .eq('date', data.date)
      .order('created_at', { ascending: true })

    if (nurseryId) {
      query = query.eq('children.nursery_id', nurseryId)
    }

    const { data: records, error } = await query
    if (error) throw new Error(err.fetch_failed)

    // Filter out records where the join returned null (child not in this nursery)
    return (records ?? []).filter((r) => r.children !== null)
  })

export const ensureTodayRecords = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    const user = await requireManagerRole(data.accessToken)
    const { role } = await requireAuth(data.accessToken)
    const nurseryId = await resolveNurseryId(user, role)

    const supabase = createServiceClient()
    const today = new Date().toISOString().split('T')[0]

    // Get all children for the nursery
    let childQuery = supabase.from('children').select('id')
    if (nurseryId) childQuery = childQuery.eq('nursery_id', nurseryId)
    const { data: children, error: childErr } = await childQuery
    if (childErr) throw new Error(err.ensure_failed)
    if (!children?.length) return { created: 0 }

    // Get existing records for today
    const childIds = children.map((c) => c.id)
    const { data: existing, error: existErr } = await supabase
      .from('daily_attendance')
      .select('child_id')
      .eq('date', today)
      .in('child_id', childIds)
    if (existErr) throw new Error(err.ensure_failed)

    const existingIds = new Set((existing ?? []).map((r) => r.child_id))
    const missing = childIds.filter((id) => !existingIds.has(id))

    if (missing.length === 0) return { created: 0 }

    const rows = missing.map((child_id) => ({ child_id, date: today }))
    const { error: insertErr } = await supabase.from('daily_attendance').insert(rows)
    if (insertErr) throw new Error(err.ensure_failed)

    return { created: missing.length }
  })

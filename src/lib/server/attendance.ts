import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuth, createServiceClient, requireManagerRole, resolveNurseryId } from './auth'

const err = {
  fetch_failed: 'שגיאה בטעינת נתוני נוכחות. אנא נסה שוב',
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

export const getTeacherAttendanceToday = createServerFn({ method: 'GET' })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    const { user, role } = await requireAuth(data.accessToken)
    const nurseryId = await resolveNurseryId(user, role)

    const supabase = createServiceClient()
    const today = new Date().toISOString().split('T')[0]

    let query = supabase
      .from('daily_attendance')
      .select('*, children(name, nursery_id)')
      .eq('date', today)
      .order('created_at', { ascending: true })

    if (nurseryId) {
      query = query.eq('children.nursery_id', nurseryId)
    }

    const { data: records, error } = await query
    if (error) throw new Error(err.fetch_failed)

    return (records ?? []).filter((r) => r.children !== null)
  })

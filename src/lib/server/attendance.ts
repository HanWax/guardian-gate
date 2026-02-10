import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createServiceClient, requireAuth, requireManagerRole, resolveNurseryId } from './auth'
import { teacherConfirmSchema } from '../schemas/attendance'

const err = {
  fetch_failed: 'שגיאה בטעינת נתוני נוכחות. אנא נסה שוב',
  ensure_failed: 'שגיאה ביצירת רשומות נוכחות. אנא נסה שוב',
  confirm_failed: 'שגיאה באישור נוכחות. אנא נסה שוב',
  record_not_found: 'רשומת הנוכחות לא נמצאה',
  not_in_nursery: 'אין לך הרשאה לאשר נוכחות עבור ילד זה',
  teacher_not_found: 'לא נמצא פרופיל מורה למשתמש זה',
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

export const confirmAttendance = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({
    attendanceId: z.string().uuid(),
    confirmed: z.boolean(),
  }))
  .handler(async ({ data }) => {
    const parsed = teacherConfirmSchema.safeParse({
      attendanceId: data.attendanceId,
      confirmed: data.confirmed,
    })
    if (!parsed.success) throw new Error(err.confirm_failed)

    const { user, role } = await requireAuth(data.accessToken)
    const nurseryId = await resolveNurseryId(user, role)

    const supabase = createServiceClient()

    // Look up the teacher record for teacher_confirmed_by FK
    const { data: teacher, error: teacherErr } = await supabase
      .from('teachers')
      .select('id, nursery_id')
      .eq('user_id', user.id)
      .single()

    // For admin/manager, skip teacher lookup requirement
    const isTeacher = !teacherErr && teacher
    if (role === 'teacher' && !isTeacher) throw new Error(err.teacher_not_found)

    // Verify attendance record exists and belongs to this nursery
    const { data: record, error: recordErr } = await supabase
      .from('daily_attendance')
      .select('id, child_id, children(nursery_id)')
      .eq('id', data.attendanceId)
      .single()

    if (recordErr || !record) throw new Error(err.record_not_found)

    if (nurseryId) {
      const childNursery = (record.children as unknown as { nursery_id: string })?.nursery_id
      if (childNursery !== nurseryId) throw new Error(err.not_in_nursery)
    }

    const updateData = data.confirmed
      ? {
          teacher_confirmed: true,
          teacher_confirmed_time: new Date().toISOString(),
          teacher_confirmed_by: isTeacher ? teacher.id : null,
        }
      : {
          teacher_confirmed: false,
          teacher_confirmed_time: null,
          teacher_confirmed_by: null,
        }

    const { error: updateErr } = await supabase
      .from('daily_attendance')
      .update(updateData)
      .eq('id', data.attendanceId)

    if (updateErr) throw new Error(err.confirm_failed)

    return { success: true }
  })

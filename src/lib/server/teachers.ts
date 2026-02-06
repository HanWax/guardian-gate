import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { teacherCreateSchema, teacherUpdateSchema } from '../schemas/teacher'
import { createServiceClient, requireManagerRole } from './auth'

const err = {
  not_found: 'מורה לא נמצא/ה',
  create_failed: 'שגיאה ביצירת מורה. אנא נסה שוב',
  update_failed: 'שגיאה בעדכון מורה. אנא נסה שוב',
  delete_failed: 'שגיאה במחיקת מורה. אנא נסה שוב',
  fetch_failed: 'שגיאה בטעינת נתונים. אנא נסה שוב',
} as const

const tokenSchema = z.object({ accessToken: z.string().min(1) })

export const getTeachers = createServerFn({ method: 'GET' })
  .inputValidator(tokenSchema.extend({ nursery_id: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    await requireManagerRole(data.accessToken)
    const supabase = createServiceClient()
    let query = supabase.from('teachers').select('*').order('name', { ascending: true })
    if (data.nursery_id) query = query.eq('nursery_id', data.nursery_id)
    const { data: teachers, error } = await query
    if (error) throw new Error(err.fetch_failed)
    return teachers
  })

export const getTeacher = createServerFn({ method: 'GET' })
  .inputValidator(tokenSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireManagerRole(data.accessToken)
    const supabase = createServiceClient()
    const { data: teacher, error } = await supabase
      .from('teachers').select('*').eq('id', data.id).single()
    if (error || !teacher) throw new Error(err.not_found)
    return teacher
  })

export const createTeacher = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ teacher: teacherCreateSchema }))
  .handler(async ({ data }) => {
    await requireManagerRole(data.accessToken)
    const supabase = createServiceClient()
    const { data: teacher, error } = await supabase
      .from('teachers').insert(data.teacher).select().single()
    if (error) throw new Error(err.create_failed)
    return teacher
  })

export const updateTeacher = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ id: z.string().uuid(), teacher: teacherUpdateSchema }))
  .handler(async ({ data }) => {
    await requireManagerRole(data.accessToken)
    const supabase = createServiceClient()
    const { data: teacher, error } = await supabase
      .from('teachers').update(data.teacher).eq('id', data.id).select().single()
    if (error) throw new Error(err.update_failed)
    if (!teacher) throw new Error(err.not_found)
    return teacher
  })

export const deleteTeacher = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireManagerRole(data.accessToken)
    const supabase = createServiceClient()
    const { error } = await supabase.from('teachers').delete().eq('id', data.id)
    if (error) throw new Error(err.delete_failed)
    return { success: true }
  })

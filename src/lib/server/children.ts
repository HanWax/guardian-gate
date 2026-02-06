import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { childCreateSchema, childUpdateSchema } from '../schemas/child'
import { createServiceClient, requireAuth, requireManagerRole, resolveNurseryId } from './auth'

const err = {
  not_found: 'ילד/ה לא נמצא/א',
  create_failed: 'שגיאה ביצירת רשומת ילד/ה. אנא נסה שוב',
  update_failed: 'שגיאה בעדכון פרטי ילד/ה. אנא נסה שוב',
  delete_failed: 'שגיאה במחיקת ילד/ה. אנא נסה שוב',
  fetch_failed: 'שגיאה בטעינת נתונים. אנא נסה שוב',
} as const

const tokenSchema = z.object({ accessToken: z.string().min(1) })

export const getChildren = createServerFn({ method: 'GET' })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    const { user, role } = await requireAuth(data.accessToken)
    const nurseryId = await resolveNurseryId(user, role)
    const supabase = createServiceClient()
    let query = supabase.from('children').select('*').order('name', { ascending: true })
    if (nurseryId) query = query.eq('nursery_id', nurseryId)
    const { data: children, error } = await query
    if (error) throw new Error(err.fetch_failed)
    return children
  })

export const getChild = createServerFn({ method: 'GET' })
  .inputValidator(tokenSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAuth(data.accessToken)
    const supabase = createServiceClient()
    const { data: child, error } = await supabase
      .from('children').select('*').eq('id', data.id).single()
    if (error || !child) throw new Error(err.not_found)
    return child
  })

export const createChild = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ child: childCreateSchema }))
  .handler(async ({ data }) => {
    const user = await requireManagerRole(data.accessToken)
    const { role } = await requireAuth(data.accessToken)
    const nurseryId = await resolveNurseryId(user, role)
    if (!nurseryId) throw new Error('אדמין חייב לציין גן')
    const supabase = createServiceClient()
    const { data: child, error } = await supabase
      .from('children').insert({ name: data.child.name, nursery_id: nurseryId }).select().single()
    if (error) throw new Error(err.create_failed)
    return child
  })

export const updateChild = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ id: z.string().uuid(), child: childUpdateSchema }))
  .handler(async ({ data }) => {
    await requireManagerRole(data.accessToken)
    const supabase = createServiceClient()
    const { data: child, error } = await supabase
      .from('children').update({ name: data.child.name }).eq('id', data.id).select().single()
    if (error) throw new Error(err.update_failed)
    if (!child) throw new Error(err.not_found)
    return child
  })

export const deleteChild = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireManagerRole(data.accessToken)
    const supabase = createServiceClient()
    const { error } = await supabase.from('children').delete().eq('id', data.id)
    if (error) throw new Error(err.delete_failed)
    return { success: true }
  })

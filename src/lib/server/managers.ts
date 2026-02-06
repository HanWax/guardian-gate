import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { managerCreateSchema, managerUpdateSchema } from '../schemas/manager'
import { createServiceClient, requireAdminRole } from './auth'

const err = {
  not_found: 'מנהל לא נמצא/ה',
  create_failed: 'שגיאה ביצירת מנהל. אנא נסה שוב',
  update_failed: 'שגיאה בעדכון מנהל. אנא נסה שוב',
  delete_failed: 'שגיאה במחיקת מנהל. אנא נסה שוב',
  fetch_failed: 'שגיאה בטעינת נתונים. אנא נסה שוב',
} as const

const tokenSchema = z.object({ accessToken: z.string().min(1) })

export const getManagers = createServerFn({ method: 'GET' })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    await requireAdminRole(data.accessToken)
    const supabase = createServiceClient()
    const { data: managers, error } = await supabase
      .from('managers')
      .select('*, nurseries(id, name)')
      .order('name', { ascending: true })
    if (error) throw new Error(err.fetch_failed)
    return managers
  })

export const getManager = createServerFn({ method: 'GET' })
  .inputValidator(tokenSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdminRole(data.accessToken)
    const supabase = createServiceClient()
    const { data: manager, error } = await supabase
      .from('managers').select('*').eq('id', data.id).single()
    if (error || !manager) throw new Error(err.not_found)
    return manager
  })

export const createManager = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ manager: managerCreateSchema }))
  .handler(async ({ data }) => {
    await requireAdminRole(data.accessToken)
    const supabase = createServiceClient()
    const { data: manager, error } = await supabase
      .from('managers').insert(data.manager).select().single()
    if (error) throw new Error(err.create_failed)
    return manager
  })

export const updateManager = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ id: z.string().uuid(), manager: managerUpdateSchema }))
  .handler(async ({ data }) => {
    await requireAdminRole(data.accessToken)
    const supabase = createServiceClient()
    const { data: manager, error } = await supabase
      .from('managers').update(data.manager).eq('id', data.id).select().single()
    if (error) throw new Error(err.update_failed)
    if (!manager) throw new Error(err.not_found)
    return manager
  })

export const deleteManager = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdminRole(data.accessToken)
    const supabase = createServiceClient()
    const { error } = await supabase.from('managers').delete().eq('id', data.id)
    if (error) throw new Error(err.delete_failed)
    return { success: true }
  })

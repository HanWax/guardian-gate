import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { parentCreateSchema, parentUpdateSchema } from '../schemas/parent'
import { normalizePhone } from '../parents'
import { createServiceClient, requireAuth, requireManagerRole, resolveNurseryId } from './auth'

const err = {
  not_found: 'הורה לא נמצא',
  create_failed: 'שגיאה ביצירת רשומת הורה. אנא נסה שוב',
  update_failed: 'שגיאה בעדכון פרטי הורה. אנא נסה שוב',
  delete_failed: 'שגיאה במחיקת הורה. אנא נסה שוב',
  fetch_failed: 'שגיאה בטעינת נתונים. אנא נסה שוב',
} as const

const tokenSchema = z.object({ accessToken: z.string().min(1) })

export const getParents = createServerFn({ method: 'GET' })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    const { user, role } = await requireAuth(data.accessToken)
    const nurseryId = await resolveNurseryId(user, role)
    const supabase = createServiceClient()

    if (nurseryId) {
      const { data: parents, error } = await supabase
        .from('parents')
        .select('*, children_parents!inner(children!inner(nursery_id))')
        .eq('children_parents.children.nursery_id', nurseryId)
        .order('name', { ascending: true })

      if (error) {
        const { data: all, error: fallbackError } = await supabase
          .from('parents').select('*').order('name', { ascending: true })
        if (fallbackError) throw new Error(err.fetch_failed)
        return all
      }

      const seen = new Set<string>()
      return parents.filter((p) => {
        if (seen.has(p.id)) return false
        seen.add(p.id)
        return true
      })
    }

    const { data: parents, error } = await supabase
      .from('parents').select('*').order('name', { ascending: true })
    if (error) throw new Error(err.fetch_failed)
    return parents
  })

export const getParent = createServerFn({ method: 'GET' })
  .inputValidator(tokenSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAuth(data.accessToken)
    const supabase = createServiceClient()
    const { data: parent, error } = await supabase
      .from('parents').select('*').eq('id', data.id).single()
    if (error || !parent) throw new Error(err.not_found)
    return parent
  })

export const createParent = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ parent: parentCreateSchema }))
  .handler(async ({ data }) => {
    await requireManagerRole(data.accessToken)
    const supabase = createServiceClient()
    const { data: parent, error } = await supabase
      .from('parents')
      .insert({ name: data.parent.name, phone: normalizePhone(data.parent.phone) })
      .select().single()
    if (error) throw new Error(err.create_failed)
    return parent
  })

export const updateParent = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ id: z.string().uuid(), parent: parentUpdateSchema }))
  .handler(async ({ data }) => {
    await requireManagerRole(data.accessToken)
    const supabase = createServiceClient()
    const { data: parent, error } = await supabase
      .from('parents')
      .update({ name: data.parent.name, phone: normalizePhone(data.parent.phone) })
      .eq('id', data.id).select().single()
    if (error) throw new Error(err.update_failed)
    if (!parent) throw new Error(err.not_found)
    return parent
  })

export const deleteParent = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireManagerRole(data.accessToken)
    const supabase = createServiceClient()
    const { error } = await supabase.from('parents').delete().eq('id', data.id)
    if (error) throw new Error(err.delete_failed)
    return { success: true }
  })

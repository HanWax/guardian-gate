import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { parentCreateSchema, parentUpdateSchema } from '../schemas/parent'
import { normalizePhone } from '../parents'
import { createServiceClient, requireAuth, requireAdminRole } from './auth'

const err = {
  not_found: 'הורה לא נמצא',
  create_failed: 'שגיאה ביצירת רשומת הורה. אנא נסה שוב',
  update_failed: 'שגיאה בעדכון פרטי הורה. אנא נסה שוב',
  delete_failed: 'שגיאה במחיקת הורה. אנא נסה שוב',
  fetch_failed: 'שגיאה בטעינת נתונים. אנא נסה שוב',
} as const
const unauthorized = 'אין לך הרשאה לבצע פעולה זו'

const tokenSchema = z.object({ accessToken: z.string().min(1) })

async function assertParentWritableByNursery(
  supabase: ReturnType<typeof createServiceClient>,
  parentId: string,
  nurseryId: string,
) {
  const { data: parent, error: parentError } = await supabase
    .from('parents')
    .select('id, owner_nursery_id')
    .eq('id', parentId)
    .maybeSingle()

  if (parentError || !parent) throw new Error(err.not_found)
  if (parent.owner_nursery_id === nurseryId) return

  const { data: links, error: linksError } = await supabase
    .from('children_parents')
    .select('children!inner(nursery_id)')
    .eq('parent_id', parentId)

  if (linksError) throw new Error(err.fetch_failed)

  const nurseryIds = [...new Set(
    (links ?? [])
      .map((link) => {
        const child = Array.isArray(link.children) ? link.children[0] : link.children
        return child?.nursery_id
      })
      .filter((id): id is string => typeof id === 'string'),
  )]

  if (nurseryIds.length === 0) throw new Error(unauthorized)
  if (nurseryIds.some((id) => id !== nurseryId)) throw new Error(unauthorized)
}

export const getParents = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    const { nurseryId } = await requireAuth(data.accessToken)
    const supabase = createServiceClient()
    const { data: linkedParents, error: linkedError } = await supabase
      .from('parents')
      .select('id, name, phone, children_parents!inner(children!inner(nursery_id))')
      .eq('children_parents.children.nursery_id', nurseryId)
      .order('name', { ascending: true })

    if (linkedError) throw new Error(err.fetch_failed)

    const { data: ownedParents, error: ownedError } = await supabase
      .from('parents')
      .select('id, name, phone')
      .eq('owner_nursery_id', nurseryId)
      .order('name', { ascending: true })

    if (ownedError) throw new Error(err.fetch_failed)

    const byId = new Map<string, { id: string; name: string; phone: string }>()
    for (const parent of [...(linkedParents ?? []), ...(ownedParents ?? [])]) {
      byId.set(parent.id, { id: parent.id, name: parent.name, phone: parent.phone })
    }

    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'he'))
  })

export const getParent = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { nurseryId } = await requireAuth(data.accessToken)
    const supabase = createServiceClient()
    const { data: parent, error: parentError } = await supabase
      .from('parents')
      .select('id, name, phone, owner_nursery_id')
      .eq('id', data.id)
      .maybeSingle()

    if (parentError || !parent) throw new Error(err.not_found)
    if (parent.owner_nursery_id === nurseryId) {
      return { id: parent.id, name: parent.name, phone: parent.phone }
    }

    const { data: links, error: linksError } = await supabase
      .from('children_parents')
      .select('children!inner(nursery_id)')
      .eq('parent_id', data.id)

    if (linksError) throw new Error(err.fetch_failed)

    const linkedToNursery = (links ?? []).some((link) => {
      const child = Array.isArray(link.children) ? link.children[0] : link.children
      return child?.nursery_id === nurseryId
    })

    if (!linkedToNursery) throw new Error(err.not_found)

    return {
      id: parent.id,
      name: parent.name,
      phone: parent.phone,
    }
  })

export const createParent = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ parent: parentCreateSchema }))
  .handler(async ({ data }) => {
    const { nurseryId } = await requireAdminRole(data.accessToken)
    const supabase = createServiceClient()
    const { data: parent, error } = await supabase
      .from('parents')
      .insert({
        name: data.parent.name,
        phone: normalizePhone(data.parent.phone),
        owner_nursery_id: nurseryId,
      })
      .select().single()
    if (error) throw new Error(err.create_failed)
    return parent
  })

export const updateParent = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ id: z.string().uuid(), parent: parentUpdateSchema }))
  .handler(async ({ data }) => {
    const { nurseryId } = await requireAdminRole(data.accessToken)
    const supabase = createServiceClient()
    await assertParentWritableByNursery(supabase, data.id, nurseryId)
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
    const { nurseryId } = await requireAdminRole(data.accessToken)
    const supabase = createServiceClient()
    await assertParentWritableByNursery(supabase, data.id, nurseryId)
    const { error } = await supabase.from('parents').delete().eq('id', data.id)
    if (error) throw new Error(err.delete_failed)
    return { success: true }
  })

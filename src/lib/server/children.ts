import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { childCreateSchema, childUpdateSchema } from '../schemas/child'
import { createServiceClient, requireAuth, requireAdminRole } from './auth'

const err = {
  not_found: 'ילד/ה לא נמצא/א',
  create_failed: 'שגיאה ביצירת רשומת ילד/ה. אנא נסה שוב',
  update_failed: 'שגיאה בעדכון פרטי ילד/ה. אנא נסה שוב',
  delete_failed: 'שגיאה במחיקת ילד/ה. אנא נסה שוב',
  fetch_failed: 'שגיאה בטעינת נתונים. אנא נסה שוב',
} as const
const unauthorized = 'אין לך הרשאה לבצע פעולה זו'

const tokenSchema = z.object({ accessToken: z.string().min(1) })

async function ensureTeacherInNursery(
  supabase: ReturnType<typeof createServiceClient>,
  teacherId: string,
  nurseryId: string,
) {
  const { data: teacher, error } = await supabase
    .from('teachers')
    .select('id')
    .eq('id', teacherId)
    .eq('nursery_id', nurseryId)
    .maybeSingle()

  if (error || !teacher) throw new Error(unauthorized)
}

async function ensureParentsAssignableToNursery(
  supabase: ReturnType<typeof createServiceClient>,
  parentIds: string[],
  nurseryId: string,
) {
  const uniqueParentIds = [...new Set(parentIds)]

  const { data: parents, error: parentError } = await supabase
    .from('parents')
    .select('id')
    .in('id', uniqueParentIds)

  if (parentError || !parents || parents.length !== uniqueParentIds.length) {
    throw new Error(err.create_failed)
  }

  const { data: existingLinks, error: linksError } = await supabase
    .from('children_parents')
    .select('parent_id, children!inner(nursery_id)')
    .in('parent_id', uniqueParentIds)

  if (linksError) throw new Error(err.create_failed)

  for (const link of existingLinks ?? []) {
    const child = Array.isArray(link.children) ? link.children[0] : link.children
    if (child?.nursery_id && child.nursery_id !== nurseryId) throw new Error(unauthorized)
  }
}

export const getChildren = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    const { nurseryId } = await requireAuth(data.accessToken)
    const supabase = createServiceClient()
    const query = supabase
      .from('children')
      .select('*')
      .eq('nursery_id', nurseryId)
      .order('name', { ascending: true })
    const { data: children, error } = await query
    if (error) throw new Error(err.fetch_failed)
    return children
  })

export const getChild = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { nurseryId } = await requireAuth(data.accessToken)
    const supabase = createServiceClient()
    const { data: child, error } = await supabase
      .from('children')
      .select('*')
      .eq('id', data.id)
      .eq('nursery_id', nurseryId)
      .single()
    if (error || !child) throw new Error(err.not_found)
    return child
  })

export const createChild = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ child: childCreateSchema }))
  .handler(async ({ data }) => {
    const { nurseryId } = await requireAdminRole(data.accessToken)
    const supabase = createServiceClient()
    await ensureTeacherInNursery(supabase, data.child.teacher_id, nurseryId)
    await ensureParentsAssignableToNursery(supabase, data.child.parent_ids, nurseryId)

    const { data: childId, error: rpcError } = await supabase.rpc('create_child_with_parents', {
      p_name: data.child.name,
      p_nursery_id: nurseryId,
      p_parent_ids: data.child.parent_ids,
      p_teacher_id: data.child.teacher_id,
    })

    if (rpcError) throw new Error(err.create_failed)

    const { data: child, error } = await supabase
      .from('children')
      .select('*')
      .eq('id', childId)
      .eq('nursery_id', nurseryId)
      .single()

    if (error || !child) throw new Error(err.create_failed)
    return child
  })

export const updateChild = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ id: z.string().uuid(), child: childUpdateSchema }))
  .handler(async ({ data }) => {
    const { nurseryId } = await requireAdminRole(data.accessToken)
    const supabase = createServiceClient()
    await ensureTeacherInNursery(supabase, data.child.teacher_id, nurseryId)
    const { data: child, error } = await supabase
      .from('children')
      .update({ name: data.child.name, teacher_id: data.child.teacher_id })
      .eq('id', data.id)
      .eq('nursery_id', nurseryId)
      .select()
      .single()
    if (error) throw new Error(err.update_failed)
    if (!child) throw new Error(err.not_found)
    return child
  })

export const deleteChild = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { nurseryId } = await requireAdminRole(data.accessToken)
    const supabase = createServiceClient()
    const { error } = await supabase
      .from('children')
      .delete()
      .eq('id', data.id)
      .eq('nursery_id', nurseryId)
    if (error) throw new Error(err.delete_failed)
    return { success: true }
  })

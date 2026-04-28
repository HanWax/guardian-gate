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

async function ensureTeachersInNursery(
  supabase: ReturnType<typeof createServiceClient>,
  teacherIds: string[],
  nurseryId: string,
) {
  const { data: teachers, error } = await supabase
    .from('teachers')
    .select('id')
    .in('id', teacherIds)
    .eq('nursery_id', nurseryId)

  if (error || !teachers || teachers.length !== teacherIds.length) {
    throw new Error(unauthorized)
  }
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
    await ensureTeachersInNursery(supabase, data.child.teacher_ids, nurseryId)
    await ensureParentsAssignableToNursery(supabase, data.child.parent_ids, nurseryId)

    const { data: child, error: insertError } = await supabase
      .from('children')
      .insert({
        nursery_id: nurseryId,
        name: data.child.name,
      })
      .select()
      .single()

    if (insertError || !child) throw new Error(err.create_failed)

    const { error: parentsError } = await supabase
      .from('children_parents')
      .insert(data.child.parent_ids.map(parent_id => ({
        child_id: child.id,
        parent_id,
      })))

    if (parentsError) throw new Error(err.create_failed)

    const { error: teachersError } = await supabase
      .from('children_teachers')
      .insert(data.child.teacher_ids.map(teacher_id => ({
        child_id: child.id,
        teacher_id,
      })))

    if (teachersError) throw new Error(err.create_failed)

    return child
  })

export const updateChild = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ id: z.string().uuid(), child: childUpdateSchema }))
  .handler(async ({ data }) => {
    const { nurseryId } = await requireAdminRole(data.accessToken)
    const supabase = createServiceClient()
    await ensureTeachersInNursery(supabase, data.child.teacher_ids, nurseryId)

    const { data: child, error: updateError } = await supabase
      .from('children')
      .update({ name: data.child.name })
      .eq('id', data.id)
      .eq('nursery_id', nurseryId)
      .select()
      .single()

    if (updateError || !child) throw new Error(err.update_failed)

    const { error: deleteError } = await supabase
      .from('children_teachers')
      .delete()
      .eq('child_id', data.id)

    if (deleteError) throw new Error(err.update_failed)

    const { error: insertError } = await supabase
      .from('children_teachers')
      .insert(data.child.teacher_ids.map(teacher_id => ({
        child_id: data.id,
        teacher_id,
      })))

    if (insertError) throw new Error(err.update_failed)

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

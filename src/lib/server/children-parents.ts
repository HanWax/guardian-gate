import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createServiceClient, requireAdminRole } from './auth'
import { CreateChildrenParentsSchema, DeleteChildrenParentsSchema } from '../schemas/children-parents'

const err = {
  fetch_failed: 'שגיאה בטעינת נתונים. אנא נסה שוב',
  assign_failed: 'שגיאה בשיוך הורה לילד/ה. אנא נסה שוב',
  unassign_failed: 'שגיאה בביטול שיוך הורה מילד/ה. אנא נסה שוב',
  already_assigned: 'ההורה כבר משויך/ת לילד/ה זה/ו',
} as const
const unauthorized = 'אין לך הרשאה לבצע פעולה זו'

const tokenSchema = z.object({ accessToken: z.string().min(1) })

async function assertChildInNursery(
  supabase: ReturnType<typeof createServiceClient>,
  childId: string,
  nurseryId: string,
) {
  const { data: child, error } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('nursery_id', nurseryId)
    .maybeSingle()

  if (error || !child) throw new Error(unauthorized)
}

async function assertParentInNursery(
  supabase: ReturnType<typeof createServiceClient>,
  parentId: string,
  nurseryId: string,
) {
  const { data: parent, error: parentError } = await supabase
    .from('parents')
    .select('id')
    .eq('id', parentId)
    .maybeSingle()

  if (parentError || !parent) throw new Error(err.fetch_failed)

  const { data: links, error: linksError } = await supabase
    .from('children_parents')
    .select('children!inner(nursery_id)')
    .eq('parent_id', parentId)

  if (linksError) throw new Error(err.fetch_failed)

  const hasCrossNurseryLink = (links ?? []).some((link) => {
    const child = Array.isArray(link.children) ? link.children[0] : link.children
    return !!child?.nursery_id && child.nursery_id !== nurseryId
  })

  if (hasCrossNurseryLink) throw new Error(unauthorized)
}

export const getParentsForChild = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ childId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { nurseryId } = await requireAdminRole(data.accessToken)
    const supabase = createServiceClient()
    await assertChildInNursery(supabase, data.childId, nurseryId)
    const { data: assignments, error } = await supabase
      .from('children_parents')
      .select('parent_id, parents(*)')
      .eq('child_id', data.childId)
    if (error) throw new Error(err.fetch_failed)
    return assignments.map((a) => a.parents).filter(Boolean)
  })

export const getChildrenForParent = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ parentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { nurseryId } = await requireAdminRole(data.accessToken)
    const supabase = createServiceClient()
    await assertParentInNursery(supabase, data.parentId, nurseryId)
    const { data: assignments, error } = await supabase
      .from('children_parents')
      .select('child_id, children!inner(*)')
      .eq('parent_id', data.parentId)
      .eq('children.nursery_id', nurseryId)
    if (error) throw new Error(err.fetch_failed)

    const childIds = assignments.map((a) => a.child_id).filter(Boolean)
    if (childIds.length === 0) return []
    const { data: allLinks, error: linksError } = await supabase
      .from('children_parents')
      .select('child_id')
      .in('child_id', childIds)
    if (linksError) throw new Error(err.fetch_failed)

    const parentCountMap = (allLinks ?? []).reduce<Record<string, number>>((acc, link) => {
      acc[link.child_id] = (acc[link.child_id] ?? 0) + 1
      return acc
    }, {})

    return assignments
      .map((a) => {
        const child = a.children
        if (!child) return null
        return { ...child, parentCount: parentCountMap[a.child_id] ?? 1 }
      })
      .filter(Boolean)
  })

export const assignParentToChild = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ assignment: CreateChildrenParentsSchema }))
  .handler(async ({ data }) => {
    const { nurseryId } = await requireAdminRole(data.accessToken)
    const supabase = createServiceClient()
    await assertChildInNursery(supabase, data.assignment.child_id, nurseryId)
    await assertParentInNursery(supabase, data.assignment.parent_id, nurseryId)

    // Check for duplicate assignment
    const { data: existing } = await supabase
      .from('children_parents')
      .select('*')
      .eq('child_id', data.assignment.child_id)
      .eq('parent_id', data.assignment.parent_id)
      .maybeSingle()

    if (existing) throw new Error(err.already_assigned)

    // Insert new assignment
    const { data: assignment, error } = await supabase
      .from('children_parents')
      .insert({
        child_id: data.assignment.child_id,
        parent_id: data.assignment.parent_id,
      })
      .select()
      .single()

    if (error) throw new Error(err.assign_failed)
    return assignment
  })

export const unassignParentFromChild = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ assignment: DeleteChildrenParentsSchema }))
  .handler(async ({ data }) => {
    const { nurseryId } = await requireAdminRole(data.accessToken)
    const supabase = createServiceClient()
    await assertChildInNursery(supabase, data.assignment.child_id, nurseryId)
    await assertParentInNursery(supabase, data.assignment.parent_id, nurseryId)

    const { count } = await supabase
      .from('children_parents')
      .select('*', { count: 'exact', head: true })
      .eq('child_id', data.assignment.child_id)

    if (count !== null && count <= 1) {
      // Last parent — delete the child entirely (cascades to all linked tables)
      const { error } = await supabase
        .from('children')
        .delete()
        .eq('id', data.assignment.child_id)
      if (error) throw new Error(err.unassign_failed)
    } else {
      const { error } = await supabase
        .from('children_parents')
        .delete()
        .eq('child_id', data.assignment.child_id)
        .eq('parent_id', data.assignment.parent_id)
      if (error) throw new Error(err.unassign_failed)
    }

    return { success: true }
  })

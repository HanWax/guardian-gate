import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createServiceClient, requireAuth } from './auth'
import { CreateChildrenParentsSchema, DeleteChildrenParentsSchema } from '../schemas/children-parents'

const err = {
  fetch_failed: 'שגיאה בטעינת נתונים. אנא נסה שוב',
  assign_failed: 'שגיאה בשיוך הורה לילד/ה. אנא נסה שוב',
  unassign_failed: 'שגיאה בביטול שיוך הורה מילד/ה. אנא נסה שוב',
  already_assigned: 'ההורה כבר משויך/ת לילד/ה זה/ו',
} as const

const tokenSchema = z.object({ accessToken: z.string().min(1) })

export const getParentsForChild = createServerFn({ method: 'GET' })
  .inputValidator(tokenSchema.extend({ childId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAuth(data.accessToken)
    const supabase = createServiceClient()
    const { data: assignments, error } = await supabase
      .from('children_parents')
      .select('parent_id, parents(*)')
      .eq('child_id', data.childId)
    if (error) throw new Error(err.fetch_failed)
    return assignments.map((a) => a.parents).filter(Boolean)
  })

export const getChildrenForParent = createServerFn({ method: 'GET' })
  .inputValidator(tokenSchema.extend({ parentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAuth(data.accessToken)
    const supabase = createServiceClient()
    const { data: assignments, error } = await supabase
      .from('children_parents')
      .select('child_id, children(*)')
      .eq('parent_id', data.parentId)
    if (error) throw new Error(err.fetch_failed)
    return assignments.map((a) => a.children).filter(Boolean)
  })

export const assignParentToChild = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ assignment: CreateChildrenParentsSchema }))
  .handler(async ({ data }) => {
    await requireAuth(data.accessToken)
    const supabase = createServiceClient()

    // Check for duplicate assignment
    const { data: existing } = await supabase
      .from('children_parents')
      .select('*')
      .eq('child_id', data.assignment.child_id)
      .eq('parent_id', data.assignment.parent_id)
      .single()

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
    await requireAuth(data.accessToken)
    const supabase = createServiceClient()

    const { error } = await supabase
      .from('children_parents')
      .delete()
      .eq('child_id', data.assignment.child_id)
      .eq('parent_id', data.assignment.parent_id)

    if (error) throw new Error(err.unassign_failed)
    return { success: true }
  })

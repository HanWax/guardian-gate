import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createServiceClient, requireAuth } from './auth'

const err = {
  fetch_failed: 'שגיאה בטעינת נתונים. אנא נסה שוב',
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

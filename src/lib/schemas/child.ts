import { z } from 'zod'

export const childSchema = z.object({
  name: z.string().min(2, 'שם חייב להכיל לפחות 2 תווים'),
  teacher_id: z.string().uuid().nullable().optional(),
})

export const childCreateSchema = childSchema.extend({
  nursery_id: z.string().uuid('יש לבחור גן').optional(),
  parent_ids: z.array(z.string().uuid()).min(1, 'יש לבחור לפחות הורה אחד'),
})
export const childUpdateSchema = childSchema

export type ChildCreate = z.infer<typeof childCreateSchema>
export type ChildUpdate = z.infer<typeof childUpdateSchema>

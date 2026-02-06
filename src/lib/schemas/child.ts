import { z } from 'zod'

export const childSchema = z.object({
  name: z.string().min(2, 'שם חייב להכיל לפחות 2 תווים'),
})

export const childCreateSchema = childSchema
export const childUpdateSchema = childSchema

export type ChildCreate = z.infer<typeof childCreateSchema>
export type ChildUpdate = z.infer<typeof childUpdateSchema>

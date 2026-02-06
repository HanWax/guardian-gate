import { z } from 'zod'

const ISRAELI_MOBILE_REGEX = /^(\+972|0)5\d[-\s]?\d{3}[-\s]?\d{4}$/

export const parentSchema = z.object({
  name: z.string().min(2, 'שם חייב להכיל לפחות 2 תווים'),
  phone: z.string().regex(ISRAELI_MOBILE_REGEX, 'מספר טלפון לא תקין'),
})

export const parentCreateSchema = parentSchema
export const parentUpdateSchema = parentSchema

export type ParentCreate = z.infer<typeof parentCreateSchema>
export type ParentUpdate = z.infer<typeof parentUpdateSchema>

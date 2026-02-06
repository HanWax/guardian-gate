import { z } from 'zod';

export const managerCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'שם הוא שדה חובה'),
  phone: z
    .string()
    .trim()
    .min(1, 'טלפון הוא שדה חובה')
    .regex(/^\+?\d[\d\-\s]{6,15}$/, 'מספר טלפון לא תקין'),
  nursery_id: z
    .string()
    .uuid('מזהה גן לא תקין'),
});

export const managerUpdateSchema = managerCreateSchema.partial();

export type ManagerCreate = z.infer<typeof managerCreateSchema>;
export type ManagerUpdate = z.infer<typeof managerUpdateSchema>;

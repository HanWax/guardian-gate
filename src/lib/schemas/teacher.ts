import { z } from 'zod';

export const teacherCreateSchema = z.object({
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

export const teacherUpdateSchema = teacherCreateSchema.partial();

export type TeacherCreate = z.infer<typeof teacherCreateSchema>;
export type TeacherUpdate = z.infer<typeof teacherUpdateSchema>;

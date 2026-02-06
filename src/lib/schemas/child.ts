import { z } from 'zod';

export const childCreateSchema = z.object({
  name: z.string().min(2, 'שם חייב להכיל לפחות 2 תווים'),
});

export const childUpdateSchema = z.object({
  name: z.string().min(2, 'שם חייב להכיל לפחות 2 תווים'),
});

export type ChildCreate = z.infer<typeof childCreateSchema>;
export type ChildUpdate = z.infer<typeof childUpdateSchema>;

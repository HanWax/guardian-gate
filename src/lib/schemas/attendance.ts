import { z } from 'zod'

export const attendanceEnsureSchema = z.object({
  nurseryId: z.string().uuid().optional(),
})

export type AttendanceEnsure = z.infer<typeof attendanceEnsureSchema>

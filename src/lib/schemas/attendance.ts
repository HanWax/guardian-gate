import { z } from 'zod'

export const attendanceEnsureSchema = z.object({
  nurseryId: z.string().uuid().optional(),
})

export type AttendanceEnsure = z.infer<typeof attendanceEnsureSchema>

export const teacherConfirmSchema = z.object({
  attendanceId: z.string().uuid(),
  confirmed: z.boolean(),
})

export type TeacherConfirm = z.infer<typeof teacherConfirmSchema>

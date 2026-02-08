import { z } from 'zod';

// Time format regex: HH:mm (24-hour format)
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const updateNurserySettingsSchema = z.object({
  dropoff_start: z
    .string()
    .regex(timeRegex, 'פורמט שעה לא תקין'),
  dropoff_end: z
    .string()
    .regex(timeRegex, 'פורמט שעה לא תקין'),
  first_message_time: z
    .string()
    .regex(timeRegex, 'פורמט שעה לא תקין'),
  second_ping_time: z
    .string()
    .regex(timeRegex, 'פורמט שעה לא תקין'),
  timezone: z
    .string()
    .trim()
    .min(1, 'אזור זמן הוא שדה חובה'),
});

export type NurserySettingsUpdate = z.infer<typeof updateNurserySettingsSchema>;

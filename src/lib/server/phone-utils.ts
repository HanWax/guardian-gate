/**
 * Shared phone number format converters.
 *
 * DB stores phones as "+972XXXXXXXXX" (E.164).
 * WhatsApp API expects "972XXXXXXXXX" (no leading +).
 */

/**
 * Strips leading '+' for the WhatsApp API.
 * "+972521234567" → "972521234567"
 */
export function toWhatsAppPhone(dbPhone: string): string {
  return dbPhone.replace(/^\+/, '')
}

/**
 * Adds leading '+' to convert WhatsApp format to DB format.
 * "972521234567" → "+972521234567"
 */
export function toDbPhone(waPhone: string): string {
  return waPhone.startsWith('+') ? waPhone : `+${waPhone}`
}

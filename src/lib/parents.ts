export { parentCreateSchema as createParentSchema, parentUpdateSchema as updateParentSchema } from './schemas/parent'
export type { ParentCreate as CreateParentInput, ParentUpdate as UpdateParentInput } from './schemas/parent'

export function normalizePhone(input: string): string {
  const digits = input.replace(/[-\s]/g, '')
  return digits.startsWith('0') ? '+972' + digits.slice(1) : digits
}

export function formatPhoneDisplay(e164: string): string {
  const local = '0' + e164.slice(4)
  return local.slice(0, 3) + '-' + local.slice(3)
}

// Re-export schemas from canonical location for backward compatibility (tests)
export { parentCreateSchema as createParentSchema, parentUpdateSchema as updateParentSchema } from './schemas/parent'
export type { ParentCreate as CreateParentInput, ParentUpdate as UpdateParentInput } from './schemas/parent'

// Types

export interface Parent {
  id: string
  phone: string
  name: string
  created_at: string
}

// Phone helpers

export function normalizePhone(input: string): string {
  const digits = input.replace(/[-\s]/g, '')
  if (digits.startsWith('0')) {
    return '+972' + digits.slice(1)
  }
  return digits
}

export function formatPhoneDisplay(e164: string): string {
  // +9725XXXXXXXX → 05X-XXXXXXX
  const local = '0' + e164.slice(4) // remove +972, prepend 0
  return local.slice(0, 3) + '-' + local.slice(3)
}

export type Role = 'admin' | 'manager' | 'teacher'

const VALID_ROLES = new Set<string>(['admin', 'manager', 'teacher'])

export function extractRole(metadata: Record<string, unknown> | undefined): Role {
  const raw = metadata?.role
  return typeof raw === 'string' && VALID_ROLES.has(raw) ? (raw as Role) : 'teacher'
}

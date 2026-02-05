export type Role = 'admin' | 'manager' | 'teacher';

const VALID_ROLES: ReadonlySet<string> = new Set<Role>(['admin', 'manager', 'teacher']);

/**
 * Extracts and validates a role from user metadata.
 * Returns 'teacher' as default if role is missing or invalid.
 */
export function extractRole(metadata: Record<string, unknown> | undefined): Role {
  const raw = metadata?.role;
  if (typeof raw === 'string' && VALID_ROLES.has(raw)) {
    return raw as Role;
  }
  return 'teacher';
}

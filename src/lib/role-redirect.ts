import type { Role } from './roles'

export function getRoleRedirectPath(role: Role): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'manager':
      return '/manager'
    case 'teacher':
      return '/teacher'
  }
}

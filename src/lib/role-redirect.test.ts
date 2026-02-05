import { describe, it, expect } from 'vitest'
import { getRoleRedirectPath } from './role-redirect'

describe('getRoleRedirectPath', () => {
  it('returns /admin for admin role', () => {
    expect(getRoleRedirectPath('admin')).toBe('/admin')
  })

  it('returns /manager for manager role', () => {
    expect(getRoleRedirectPath('manager')).toBe('/manager')
  })

  it('returns /teacher for teacher role', () => {
    expect(getRoleRedirectPath('teacher')).toBe('/teacher')
  })
})

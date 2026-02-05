import { describe, it, expect } from 'vitest'
import { extractRole } from './roles'

describe('extractRole', () => {
  it('returns the role when valid', () => {
    expect(extractRole({ role: 'admin' })).toBe('admin')
    expect(extractRole({ role: 'manager' })).toBe('manager')
    expect(extractRole({ role: 'teacher' })).toBe('teacher')
  })

  it('defaults to teacher when role is missing', () => {
    expect(extractRole(undefined)).toBe('teacher')
    expect(extractRole({})).toBe('teacher')
  })

  it('defaults to teacher when role is invalid', () => {
    expect(extractRole({ role: 'superadmin' })).toBe('teacher')
    expect(extractRole({ role: 123 })).toBe('teacher')
    expect(extractRole({ role: null })).toBe('teacher')
  })
})

import { describe, it, expect } from 'vitest'
import { isValidEmail } from './validation'

describe('isValidEmail', () => {
  it('returns true for valid email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('test@domain.co.il')).toBe(true)
    expect(isValidEmail('name+tag@host.org')).toBe(true)
  })

  it('returns false for invalid email addresses', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('not-an-email')).toBe(false)
    expect(isValidEmail('@missing-local.com')).toBe(false)
    expect(isValidEmail('missing-domain@')).toBe(false)
    expect(isValidEmail('has spaces@domain.com')).toBe(false)
  })
})

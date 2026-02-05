import { describe, it, expect } from 'vitest'
import { getHebrewErrorMessage, authErrorMessages } from './supabase'

describe('getHebrewErrorMessage', () => {
  it('returns the correct Hebrew message for known error codes', () => {
    expect(getHebrewErrorMessage('invalid_credentials')).toBe('פרטי ההתחברות שגויים')
    expect(getHebrewErrorMessage('otp_expired')).toBe('הקוד פג תוקף. אנא בקש קוד חדש')
    expect(getHebrewErrorMessage('network_error')).toBe('שגיאת רשת. אנא בדוק את החיבור לאינטרנט')
  })

  it('returns unknown_error message for unrecognized error codes', () => {
    const fallback = authErrorMessages.unknown_error
    expect(getHebrewErrorMessage('some_random_code')).toBe(fallback)
    expect(getHebrewErrorMessage('')).toBe(fallback)
  })

  it('has translations for all required error codes', () => {
    const requiredCodes = [
      'invalid_credentials',
      'otp_expired',
      'user_not_found',
      'network_error',
      'invalid_email',
      'email_not_confirmed',
      'too_many_requests',
      'unauthorized',
      'session_expired',
      'unknown_error',
    ]
    for (const code of requiredCodes) {
      expect(authErrorMessages[code]).toBeDefined()
      expect(authErrorMessages[code].length).toBeGreaterThan(0)
    }
  })
})

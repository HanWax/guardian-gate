import { describe, it, expect } from 'vitest'
import { toWhatsAppPhone, toDbPhone } from './phone-utils'

describe('phone-utils', () => {
  describe('toWhatsAppPhone', () => {
    it('strips leading + from E.164 phone', () => {
      expect(toWhatsAppPhone('+972521234567')).toBe('972521234567')
    })

    it('returns as-is when no leading +', () => {
      expect(toWhatsAppPhone('972521234567')).toBe('972521234567')
    })
  })

  describe('toDbPhone', () => {
    it('adds leading + to WhatsApp format', () => {
      expect(toDbPhone('972521234567')).toBe('+972521234567')
    })

    it('returns as-is when already has +', () => {
      expect(toDbPhone('+972521234567')).toBe('+972521234567')
    })
  })
})

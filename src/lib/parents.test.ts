import { describe, it, expect } from 'vitest'
import { createParentSchema, updateParentSchema, normalizePhone, formatPhoneDisplay } from './parents'

describe('createParentSchema', () => {
  it('accepts a valid name and phone', () => {
    const result = createParentSchema.safeParse({
      name: 'דוד כהן',
      phone: '052-1234567',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a 2-character name', () => {
    const result = createParentSchema.safeParse({
      name: 'אב',
      phone: '0521234567',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an empty name', () => {
    const result = createParentSchema.safeParse({
      name: '',
      phone: '052-1234567',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a single character name', () => {
    const result = createParentSchema.safeParse({
      name: 'א',
      phone: '052-1234567',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid phone number', () => {
    const result = createParentSchema.safeParse({
      name: 'דוד כהן',
      phone: '123456',
    })
    expect(result.success).toBe(false)
  })

  it('accepts phone with international prefix', () => {
    const result = createParentSchema.safeParse({
      name: 'דוד כהן',
      phone: '+972521234567',
    })
    expect(result.success).toBe(true)
  })

  it('accepts phone without dash', () => {
    const result = createParentSchema.safeParse({
      name: 'דוד כהן',
      phone: '0521234567',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a landline number', () => {
    const result = createParentSchema.safeParse({
      name: 'דוד כהן',
      phone: '03-1234567',
    })
    expect(result.success).toBe(false)
  })
})

describe('updateParentSchema', () => {
  it('accepts a valid name and phone', () => {
    const result = updateParentSchema.safeParse({
      name: 'דוד כהן',
      phone: '052-1234567',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an empty name', () => {
    const result = updateParentSchema.safeParse({
      name: '',
      phone: '052-1234567',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid phone', () => {
    const result = updateParentSchema.safeParse({
      name: 'דוד כהן',
      phone: 'not-a-phone',
    })
    expect(result.success).toBe(false)
  })
})

describe('normalizePhone', () => {
  it('converts local format to E.164', () => {
    expect(normalizePhone('0521234567')).toBe('+972521234567')
  })

  it('converts local format with dash to E.164', () => {
    expect(normalizePhone('052-1234567')).toBe('+972521234567')
  })

  it('converts local format with spaces to E.164', () => {
    expect(normalizePhone('052 123 4567')).toBe('+972521234567')
  })

  it('keeps international format as-is (stripping dashes)', () => {
    expect(normalizePhone('+972521234567')).toBe('+972521234567')
  })

  it('strips dashes from international format', () => {
    expect(normalizePhone('+972-52-123-4567')).toBe('+972521234567')
  })
})

describe('formatPhoneDisplay', () => {
  it('converts E.164 to local display format', () => {
    expect(formatPhoneDisplay('+972521234567')).toBe('052-1234567')
  })

  it('converts another number correctly', () => {
    expect(formatPhoneDisplay('+972541112222')).toBe('054-1112222')
  })
})

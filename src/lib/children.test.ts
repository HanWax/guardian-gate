import { describe, it, expect } from 'vitest'
import { createChildSchema, updateChildSchema } from './children'

describe('createChildSchema', () => {
  it('accepts a valid name with nursery_id', () => {
    const result = createChildSchema.safeParse({
      name: 'דניאל',
      nursery_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a 2-character name', () => {
    const result = createChildSchema.safeParse({
      name: 'אב',
      nursery_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an empty name', () => {
    const result = createChildSchema.safeParse({
      name: '',
      nursery_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a single character name', () => {
    const result = createChildSchema.safeParse({
      name: 'א',
      nursery_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid nursery_id', () => {
    const result = createChildSchema.safeParse({
      name: 'דניאל',
      nursery_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })
})

describe('updateChildSchema', () => {
  it('accepts a valid name', () => {
    const result = updateChildSchema.safeParse({ name: 'דניאל' })
    expect(result.success).toBe(true)
  })

  it('accepts a 2-character name', () => {
    const result = updateChildSchema.safeParse({ name: 'אב' })
    expect(result.success).toBe(true)
  })

  it('rejects an empty name', () => {
    const result = updateChildSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a single character name', () => {
    const result = updateChildSchema.safeParse({ name: 'א' })
    expect(result.success).toBe(false)
  })
})

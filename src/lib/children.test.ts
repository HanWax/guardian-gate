import { describe, it, expect } from 'vitest'
import { createChildSchema, updateChildSchema } from './children'

const validParentIds = ['00000000-0000-0000-0000-000000000001']

describe('createChildSchema', () => {
  it('accepts a valid name with parent_ids', () => {
    const result = createChildSchema.safeParse({
      name: 'דניאל',
      parent_ids: validParentIds,
    })
    expect(result.success).toBe(true)
  })

  it('accepts a 2-character name with parent_ids', () => {
    const result = createChildSchema.safeParse({
      name: 'אב',
      parent_ids: validParentIds,
    })
    expect(result.success).toBe(true)
  })

  it('rejects an empty name', () => {
    const result = createChildSchema.safeParse({
      name: '',
      parent_ids: validParentIds,
    })
    expect(result.success).toBe(false)
  })

  it('rejects a single character name', () => {
    const result = createChildSchema.safeParse({
      name: 'א',
      parent_ids: validParentIds,
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing parent_ids', () => {
    const result = createChildSchema.safeParse({
      name: 'דניאל',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty parent_ids array', () => {
    const result = createChildSchema.safeParse({
      name: 'דניאל',
      parent_ids: [],
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

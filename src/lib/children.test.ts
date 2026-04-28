import { describe, it, expect } from 'vitest'
import { createChildSchema, updateChildSchema } from './children'

const validParentIds = ['00000000-0000-0000-0000-000000000001']
const validTeacherIds = ['00000000-0000-0000-0000-000000000002']

describe('createChildSchema', () => {
  it('accepts a valid name with parent_ids and teacher_ids', () => {
    const result = createChildSchema.safeParse({
      name: 'דניאל',
      teacher_ids: validTeacherIds,
      parent_ids: validParentIds,
    })
    expect(result.success).toBe(true)
  })

  it('accepts a 2-character name with parent_ids and teacher_ids', () => {
    const result = createChildSchema.safeParse({
      name: 'אב',
      teacher_ids: validTeacherIds,
      parent_ids: validParentIds,
    })
    expect(result.success).toBe(true)
  })

  it('rejects an empty name', () => {
    const result = createChildSchema.safeParse({
      name: '',
      teacher_ids: validTeacherIds,
      parent_ids: validParentIds,
    })
    expect(result.success).toBe(false)
  })

  it('rejects a single character name', () => {
    const result = createChildSchema.safeParse({
      name: 'א',
      teacher_ids: validTeacherIds,
      parent_ids: validParentIds,
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing parent_ids', () => {
    const result = createChildSchema.safeParse({
      name: 'דניאל',
      teacher_ids: validTeacherIds,
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty parent_ids array', () => {
    const result = createChildSchema.safeParse({
      name: 'דניאל',
      teacher_ids: validTeacherIds,
      parent_ids: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing teacher_ids', () => {
    const result = createChildSchema.safeParse({
      name: 'דניאל',
      parent_ids: validParentIds,
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty teacher_ids array', () => {
    const result = createChildSchema.safeParse({
      name: 'דניאל',
      teacher_ids: [],
      parent_ids: validParentIds,
    })
    expect(result.success).toBe(false)
  })
})

describe('updateChildSchema', () => {
  it('accepts a valid name with teacher_ids', () => {
    const result = updateChildSchema.safeParse({ name: 'דניאל', teacher_ids: validTeacherIds })
    expect(result.success).toBe(true)
  })

  it('accepts a 2-character name with teacher_ids', () => {
    const result = updateChildSchema.safeParse({ name: 'אב', teacher_ids: validTeacherIds })
    expect(result.success).toBe(true)
  })

  it('rejects an empty name', () => {
    const result = updateChildSchema.safeParse({ name: '', teacher_ids: validTeacherIds })
    expect(result.success).toBe(false)
  })

  it('rejects a single character name', () => {
    const result = updateChildSchema.safeParse({ name: 'א', teacher_ids: validTeacherIds })
    expect(result.success).toBe(false)
  })

  it('rejects missing teacher_ids', () => {
    const result = updateChildSchema.safeParse({ name: 'דניאל' })
    expect(result.success).toBe(false)
  })

  it('rejects empty teacher_ids array', () => {
    const result = updateChildSchema.safeParse({ name: 'דניאל', teacher_ids: [] })
    expect(result.success).toBe(false)
  })
})

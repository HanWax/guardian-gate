import { describe, it, expect } from 'vitest'
import { attendanceEnsureSchema, teacherConfirmSchema } from './attendance'

describe('attendanceEnsureSchema', () => {
  it('accepts empty object', () => {
    const result = attendanceEnsureSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts valid nurseryId', () => {
    const result = attendanceEnsureSchema.safeParse({
      nurseryId: '00000000-0000-0000-0000-000000000001',
    })
    expect(result.success).toBe(true)
  })

  it('accepts undefined nurseryId', () => {
    const result = attendanceEnsureSchema.safeParse({ nurseryId: undefined })
    expect(result.success).toBe(true)
  })

  it('rejects invalid uuid for nurseryId', () => {
    const result = attendanceEnsureSchema.safeParse({ nurseryId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('rejects non-string nurseryId', () => {
    const result = attendanceEnsureSchema.safeParse({ nurseryId: 123 })
    expect(result.success).toBe(false)
  })
})

describe('teacherConfirmSchema', () => {
  it('accepts valid uuid and boolean', () => {
    const result = teacherConfirmSchema.safeParse({
      attendanceId: '00000000-0000-0000-0000-000000000001',
      confirmed: true,
    })
    expect(result.success).toBe(true)
  })

  it('accepts confirmed: false', () => {
    const result = teacherConfirmSchema.safeParse({
      attendanceId: '00000000-0000-0000-0000-000000000001',
      confirmed: false,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid uuid', () => {
    const result = teacherConfirmSchema.safeParse({
      attendanceId: 'not-a-uuid',
      confirmed: true,
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing attendanceId', () => {
    const result = teacherConfirmSchema.safeParse({ confirmed: true })
    expect(result.success).toBe(false)
  })

  it('rejects missing confirmed', () => {
    const result = teacherConfirmSchema.safeParse({
      attendanceId: '00000000-0000-0000-0000-000000000001',
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-boolean confirmed', () => {
    const result = teacherConfirmSchema.safeParse({
      attendanceId: '00000000-0000-0000-0000-000000000001',
      confirmed: 'yes',
    })
    expect(result.success).toBe(false)
  })
})

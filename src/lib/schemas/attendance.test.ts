import { describe, it, expect } from 'vitest'
import { attendanceEnsureSchema } from './attendance'

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

import { describe, it, expect } from 'vitest'
import { isExpectedToArrive } from './attendance-status'

describe('isExpectedToArrive', () => {
  it('treats an on-time drop-off as expected', () => {
    expect(isExpectedToArrive('dropping_off')).toBe(true)
  })

  it('treats a late drop-off as expected', () => {
    expect(isExpectedToArrive('dropping_off_late')).toBe(true)
  })

  it('does not treat a no-show as expected', () => {
    expect(isExpectedToArrive('not_today')).toBe(false)
  })

  it('does not treat a missing response as expected', () => {
    expect(isExpectedToArrive(null)).toBe(false)
    expect(isExpectedToArrive(undefined)).toBe(false)
  })
})

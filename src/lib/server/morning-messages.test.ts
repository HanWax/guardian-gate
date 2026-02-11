import { describe, it, expect } from 'vitest'
import {
  getCurrentTimeInTimezone,
  getTodayInTimezone,
  isWithinTolerance,
} from './morning-messages'

describe('Morning Messages - Time Helpers', () => {
  describe('isWithinTolerance', () => {
    it('should return true when times are equal', () => {
      expect(isWithinTolerance('07:30', '07:30', 5)).toBe(true)
    })

    it('should return true when within tolerance', () => {
      expect(isWithinTolerance('07:33', '07:30', 5)).toBe(true)
      expect(isWithinTolerance('07:27', '07:30', 5)).toBe(true)
    })

    it('should return true at exact boundary', () => {
      expect(isWithinTolerance('07:35', '07:30', 5)).toBe(true)
      expect(isWithinTolerance('07:25', '07:30', 5)).toBe(true)
    })

    it('should return false when outside tolerance', () => {
      expect(isWithinTolerance('07:36', '07:30', 5)).toBe(false)
      expect(isWithinTolerance('07:24', '07:30', 5)).toBe(false)
    })

    it('should handle midnight wrap', () => {
      expect(isWithinTolerance('23:58', '00:02', 5)).toBe(true)
      expect(isWithinTolerance('00:03', '23:58', 5)).toBe(true)
    })

    it('should return false for distant times across midnight', () => {
      expect(isWithinTolerance('23:00', '00:30', 5)).toBe(false)
    })
  })

  describe('getCurrentTimeInTimezone', () => {
    it('should return valid HH:MM format for Asia/Jerusalem', () => {
      const time = getCurrentTimeInTimezone('Asia/Jerusalem')
      expect(time).toMatch(/^\d{2}:\d{2}$/)
    })

    it('should return valid HH:MM format for UTC', () => {
      const time = getCurrentTimeInTimezone('UTC')
      expect(time).toMatch(/^\d{2}:\d{2}$/)
    })
  })

  describe('getTodayInTimezone', () => {
    it('should return valid YYYY-MM-DD format for Asia/Jerusalem', () => {
      const date = getTodayInTimezone('Asia/Jerusalem')
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should return valid YYYY-MM-DD format for UTC', () => {
      const date = getTodayInTimezone('UTC')
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })
})

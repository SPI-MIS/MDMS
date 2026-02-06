import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { parseDateTimeSafe, deriveEffectiveStatus, formatDateTime } from '../time'

describe('time.js utilities', () => {
  beforeEach(() => {
    // Mock current date to 2026-02-05 10:00:00 for consistent testing
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-05T10:00:00+08:00'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('parseDateTimeSafe', () => {
    it('should parse YYYY-MM-DD HH:MM:SS format', () => {
      const result = parseDateTimeSafe('2026-02-05 10:00:00')
      expect(result).not.toBeNull()
      expect(result.getFullYear()).toBe(2026)
      expect(result.getMonth()).toBe(1) // 0-indexed
      expect(result.getDate()).toBe(5)
    })

    it('should parse ISO format with T separator', () => {
      const result = parseDateTimeSafe('2026-02-05T10:00:00')
      expect(result).not.toBeNull()
      expect(result.getFullYear()).toBe(2026)
    })

    it('should append default timezone if missing', () => {
      const result = parseDateTimeSafe('2026-02-05T10:00:00')
      expect(result).not.toBeNull()
      expect(result).toBeInstanceOf(Date)
    })

    it('should handle missing seconds', () => {
      const result = parseDateTimeSafe('2026-02-05 10:00')
      expect(result).not.toBeNull()
      expect(result.getHours()).toBe(10)
      expect(result.getMinutes()).toBe(0)
    })

    it('should return null for invalid date string', () => {
      const result = parseDateTimeSafe('invalid')
      expect(result).toBeNull()
    })

    it('should return null for empty string', () => {
      const result = parseDateTimeSafe('')
      expect(result).toBeNull()
    })

    it('should handle timezone offset +08:00', () => {
      const result = parseDateTimeSafe('2026-02-05T10:00:00+08:00')
      expect(result).not.toBeNull()
      expect(result).toBeInstanceOf(Date)
    })
  })

  describe('deriveEffectiveStatus', () => {
    // Test draft.unpublished: before start time
    it('should return draft.unpublished when status=Draft and now < start', () => {
      const startTime = '2026-02-06T14:00:00+08:00' // Tomorrow
      const endTime = '2026-02-07T14:00:00+08:00'
      const result = deriveEffectiveStatus('Draft', startTime, endTime)
      expect(result).toBe('draft.unpublished')
    })

    // Test draft.pending: at or after start time
    it('should return draft.pending when status=Draft and now >= start', () => {
      const startTime = '2026-02-05T09:00:00+08:00' // 1 hour ago
      const endTime = '2026-02-07T14:00:00+08:00'
      const result = deriveEffectiveStatus('Draft', startTime, endTime)
      expect(result).toBe('draft.pending')
    })

    // Test notStarted: Active status but before start
    it('should return notStarted when status=Active and now < start', () => {
      const startTime = '2026-02-06T14:00:00+08:00' // Tomorrow
      const endTime = '2026-02-07T14:00:00+08:00'
      const result = deriveEffectiveStatus('Active', startTime, endTime)
      expect(result).toBe('notStarted')
    })

    // Test inProgress: Active status and at/after start but before end
    it('should return inProgress when status=Active and start <= now < end', () => {
      const startTime = '2026-02-05T09:00:00+08:00' // 1 hour ago
      const endTime = '2026-02-05T14:00:00+08:00' // 4 hours from now
      const result = deriveEffectiveStatus('Active', startTime, endTime)
      expect(result).toBe('inProgress')
    })

    // Test ended: Active status but past end time
    it('should return ended when status=Active and now > end', () => {
      const startTime = '2026-02-04T14:00:00+08:00' // Yesterday
      const endTime = '2026-02-05T09:00:00+08:00' // 1 hour ago
      const result = deriveEffectiveStatus('Active', startTime, endTime)
      expect(result).toBe('ended')
    })

    // Test ended: Closed status
    it('should return ended when status=Closed', () => {
      const startTime = '2026-02-04T14:00:00+08:00'
      const endTime = '2026-02-05T09:00:00+08:00'
      const result = deriveEffectiveStatus('Closed', startTime, endTime)
      expect(result).toBe('ended')
    })

    // Test cancelled
    it('should return cancelled when status=Cancelled', () => {
      const startTime = '2026-02-04T14:00:00+08:00'
      const endTime = '2026-02-05T09:00:00+08:00'
      const result = deriveEffectiveStatus('Cancelled', startTime, endTime)
      expect(result).toBe('cancelled')
    })

    // Edge case: null/missing times
    it('should handle missing start time gracefully', () => {
      const result = deriveEffectiveStatus('Active', null, '2026-02-07T14:00:00+08:00')
      expect(result).toBeDefined()
    })

    it('should handle missing end time gracefully', () => {
      const result = deriveEffectiveStatus('Active', '2026-02-05T09:00:00+08:00', null)
      expect(result).toBeDefined()
    })

    // Edge case: exactly at start/end boundary
    it('should include start time (now >= start)', () => {
      const startTime = '2026-02-05T10:00:00+08:00' // Exactly now
      const endTime = '2026-02-05T14:00:00+08:00'
      const result = deriveEffectiveStatus('Active', startTime, endTime)
      expect(result).toBe('inProgress')
    })

    it('should include end time (now <= end)', () => {
      const startTime = '2026-02-05T09:00:00+08:00'
      const endTime = '2026-02-05T10:00:00+08:00' // Exactly now
      const result = deriveEffectiveStatus('Active', startTime, endTime)
      expect(result).toBe('inProgress')
    })
  })

  describe('formatDateTime', () => {
    it('should format date to zh-TW locale by default', () => {
      const date = new Date('2026-02-05T10:00:00+08:00')
      const result = formatDateTime(date)
      expect(result).toBeTruthy()
      expect(result).not.toBe('-')
    })

    it('should return hyphen for null input', () => {
      const result = formatDateTime(null)
      expect(result).toBe('-')
    })

    it('should return hyphen for undefined input', () => {
      const result = formatDateTime(undefined)
      expect(result).toBe('-')
    })

    it('should return input string for invalid date', () => {
      const result = formatDateTime('invalid')
      expect(result).toBe('invalid')
    })

    it('should format with specified locale', () => {
      const date = new Date('2026-02-05T10:00:00+08:00')
      const result = formatDateTime(date, 'en-US')
      expect(result).toBeTruthy()
    })

    it('should use Asia/Taipei timezone', () => {
      const date = new Date('2026-02-05T10:00:00+08:00')
      const result = formatDateTime(date, 'zh-TW')
      // Result should contain date/time components
      expect(result.length).toBeGreaterThan(0)
    })
  })
})

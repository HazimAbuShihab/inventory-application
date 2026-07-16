import { describe, expect, it } from 'vitest'

import {
  addDaysIso,
  formatCurrency,
  formatDate,
  formatLocation,
  getRoleLabel,
  labelize,
  todayIso,
  toIlikeTerm,
} from '@/lib/utils'

describe('formatCurrency', () => {
  it('formats numbers as USD', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50')
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('returns a dash for null/undefined', () => {
    expect(formatCurrency(null)).toBe('—')
    expect(formatCurrency(undefined)).toBe('—')
  })
})

describe('formatDate', () => {
  it('formats ISO dates', () => {
    expect(formatDate('2026-01-15')).toBe('Jan 15, 2026')
  })

  it('returns a dash for empty values', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate('')).toBe('—')
  })
})

describe('toIlikeTerm', () => {
  it('wraps the term in wildcards', () => {
    expect(toIlikeTerm('laptop')).toBe('%laptop%')
  })

  it('escapes LIKE wildcards in user input', () => {
    expect(toIlikeTerm('100%')).toBe('%100\\%%')
    expect(toIlikeTerm('a_b')).toBe('%a\\_b%')
  })

  it('strips characters that break the PostgREST or() parser', () => {
    expect(toIlikeTerm('mac,book(pro)"x"')).toBe('%mac book pro  x%')
  })

  it('returns empty string for whitespace-only input', () => {
    expect(toIlikeTerm('   ')).toBe('')
    expect(toIlikeTerm(',,,')).toBe('')
  })
})

describe('labelize', () => {
  it('turns snake_case into Title Case', () => {
    expect(labelize('under_maintenance')).toBe('Under Maintenance')
    expect(labelize('available')).toBe('Available')
  })
})

describe('getRoleLabel', () => {
  it('maps known roles', () => {
    expect(getRoleLabel('super_admin')).toBe('Super Admin')
    expect(getRoleLabel('it_admin')).toBe('IT Admin')
  })

  it('falls back to labelize for unknown roles', () => {
    expect(getRoleLabel('warehouse_manager')).toBe('Warehouse Manager')
  })

  it('returns User for missing role', () => {
    expect(getRoleLabel(null)).toBe('User')
    expect(getRoleLabel(undefined)).toBe('User')
  })
})

describe('formatLocation', () => {
  it('joins building, floor and room', () => {
    expect(formatLocation({ building: 'HQ', floor: 2, room: 'Open-Office' })).toBe(
      'HQ · Floor 2 · Open-Office',
    )
  })

  it('omits the room when absent', () => {
    expect(formatLocation({ building: 'HQ', floor: 0, room: null })).toBe('HQ · Floor 0')
  })
})

describe('date helpers', () => {
  it('todayIso returns a YYYY-MM-DD string', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('addDaysIso moves forward from today', () => {
    expect(addDaysIso(0)).toBe(todayIso())
    expect(addDaysIso(30) > todayIso()).toBe(true)
  })
})

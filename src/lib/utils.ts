import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import type { UserRole } from '@/types/database'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null | undefined) {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysIso(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * Prepares user input for a PostgREST `.or()` ilike pattern: strips the
 * characters that break the or() parser and escapes LIKE wildcards.
 */
export function toIlikeTerm(input: string) {
  const cleaned = input.trim().replace(/[,()"]/g, ' ').replace(/[%_]/g, '\\$&').trim()
  return cleaned ? `%${cleaned}%` : ''
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return `"${s.replace(/"/g, '""')}"`
  }
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const ASSET_STATUSES = [
  'available',
  'assigned',
  'under_maintenance',
  'lost',
  'damaged',
  'retired',
] as const

export const ASSET_TYPES = ['permanent', 'disposable'] as const

export const ASSET_CONDITIONS = [
  'very_bad',
  'bad',
  'low',
  'good',
  'very_good',
  'new',
] as const

export const CATEGORY_DOMAINS = ['it', 'facilities'] as const

export function formatLocation(location: {
  building: string
  floor: number
  room: string | null
}) {
  const parts = [location.building, `Floor ${location.floor}`]
  if (location.room) parts.push(location.room)
  return parts.join(' · ')
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  it_admin: 'IT Admin',
  facilities_admin: 'Facilities Admin',
  hr: 'HR',
  employee: 'Employee',
  inventory_admin: 'Inventory Admin',
}

export function getRoleLabel(roleName: string | null | undefined): string {
  if (!roleName) return 'User'
  return ROLE_LABELS[roleName as UserRole] ?? labelize(roleName)
}

export function labelize(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

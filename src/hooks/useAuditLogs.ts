import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export const auditLogKeys = {
  all: ['audit-logs'] as const,
  list: (filters: AuditLogFilters) => [...auditLogKeys.all, filters] as const,
}

export type AuditLogFilters = {
  action?: string
  entity?: string
  dateFrom?: string
  dateTo?: string
}

export type AuditLogWithUser = Tables<'audit_logs'> & {
  user: Pick<Tables<'users'>, 'full_name' | 'email'> | null
}

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: auditLogKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*, user:users(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(200)

      if (filters.action && filters.action !== 'all') {
        query = query.eq('action', filters.action)
      }
      if (filters.entity && filters.entity !== 'all') {
        query = query.eq('entity', filters.entity)
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', `${filters.dateFrom}T00:00:00`)
      }
      if (filters.dateTo) {
        query = query.lte('created_at', `${filters.dateTo}T23:59:59`)
      }

      const { data, error } = await query
      if (error) throw error
      return data as AuditLogWithUser[]
    },
  })
}

export function useAuditLogFilterOptions() {
  return useQuery({
    queryKey: [...auditLogKeys.all, 'filter-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('action, entity')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error

      const actions = [...new Set((data ?? []).map((row) => row.action))].sort()
      const entities = [...new Set((data ?? []).map((row) => row.entity))].sort()

      return { actions, entities }
    },
  })
}

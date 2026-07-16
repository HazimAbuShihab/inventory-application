import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { CategoryDomain, DashboardStats, Tables } from '@/types/database'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  lowStock: () => [...dashboardKeys.all, 'low-stock'] as const,
  auditLogs: () => [...dashboardKeys.all, 'audit-logs'] as const,
  employeeActivity: (employeeId: string) => [...dashboardKeys.all, 'employee-activity', employeeId] as const,
  warrantyExpiring: (days: number, domain?: CategoryDomain) =>
    [...dashboardKeys.all, 'warranty-expiring', days, domain ?? 'all'] as const,
  overdueAssignments: (employeeId?: string, domain?: CategoryDomain) =>
    [...dashboardKeys.all, 'overdue-assignments', employeeId ?? 'all', domain ?? 'all'] as const,
  hrRecentAssignments: () => [...dashboardKeys.all, 'hr-recent-assignments'] as const,
  pendingReturns: () => [...dashboardKeys.all, 'pending-returns'] as const,
  lostCount: () => [...dashboardKeys.all, 'lost-count'] as const,
  locationsCount: () => [...dashboardKeys.all, 'locations-count'] as const,
  domainStats: (domain: CategoryDomain) => [...dashboardKeys.all, 'domain-stats', domain] as const,
  domainMaintenance: (domain: CategoryDomain) => [...dashboardKeys.all, 'domain-maintenance', domain] as const,
  recentAssignments: () => [...dashboardKeys.all, 'recent-assignments'] as const,
}

export type DomainDashboardStats = {
  total: number
  available: number
  assigned: number
  maintenance: number
  overdue: number
}

export type LowStockAsset = Tables<'assets'> & {
  category: Pick<Tables<'asset_categories'>, 'name'> | null
}

export type WarrantyExpiringAsset = Tables<'assets'> & {
  category: Pick<Tables<'asset_categories'>, 'name' | 'domain'> | null
}

export type OverdueAssignment = Tables<'asset_assignments'> & {
  asset: Pick<Tables<'assets'>, 'id' | 'name' | 'asset_code'> | null
  employee: (Pick<Tables<'employees'>, 'id' | 'employee_number'> & {
    user: Pick<Tables<'users'>, 'full_name'> | null
  }) | null
}

export type HrRecentAssignment = Tables<'asset_assignments'> & {
  asset: Pick<Tables<'assets'>, 'name' | 'asset_code'> | null
  employee: (Pick<Tables<'employees'>, 'employee_number'> & {
    user: Pick<Tables<'users'>, 'full_name'> | null
  }) | null
}

export type AuditLogWithUser = Tables<'audit_logs'> & {
  user: Pick<Tables<'users'>, 'full_name' | 'email'> | null
}

export type EmployeeActivityItem = {
  id: string
  type: 'assignment' | 'request'
  title: string
  subtitle: string
  status: string
  date: string
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function addDaysIso(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_stats')
      if (error) throw error
      return data as DashboardStats
    },
  })
}

export function useLowStockAssets(enabled: boolean) {
  return useQuery({
    queryKey: dashboardKeys.lowStock(),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*, category:asset_categories(name)')
        .eq('asset_type', 'disposable')
        .order('quantity', { ascending: true })

      if (error) throw error

      return (data as LowStockAsset[]).filter((asset) => asset.quantity <= asset.minimum_stock_level)
    },
  })
}

export function useWarrantyExpiringAssets(days: number, enabled: boolean, domain?: CategoryDomain) {
  return useQuery({
    queryKey: dashboardKeys.warrantyExpiring(days, domain),
    enabled,
    queryFn: async () => {
      const categorySelect = domain
        ? 'category:asset_categories!inner(name, domain)'
        : 'category:asset_categories(name, domain)'

      let query = supabase
        .from('assets')
        .select(`*, ${categorySelect}`)
        .not('warranty_expiry', 'is', null)
        .gte('warranty_expiry', todayIso())
        .lte('warranty_expiry', addDaysIso(days))
        .order('warranty_expiry', { ascending: true })
        .limit(10)

      if (domain) {
        query = query.eq('category.domain', domain)
      }

      const { data, error } = await query
      if (error) throw error
      return data as WarrantyExpiringAsset[]
    },
  })
}

export function useOverdueAssignments(enabled: boolean, employeeId?: string, domain?: CategoryDomain) {
  return useQuery({
    queryKey: dashboardKeys.overdueAssignments(employeeId, domain),
    enabled,
    queryFn: async () => {
      const assetSelect = domain
        ? 'asset:assets!inner(id, name, asset_code, category:asset_categories!inner(domain))'
        : 'asset:assets(id, name, asset_code)'

      let query = supabase
        .from('asset_assignments')
        .select(
          `
          *,
          ${assetSelect},
          employee:employees(id, employee_number, user:users(full_name))
        `,
        )
        .eq('is_active', true)
        .not('expected_return_date', 'is', null)
        .lt('expected_return_date', todayIso())
        .order('expected_return_date', { ascending: true })
        .limit(10)

      if (employeeId) {
        query = query.eq('employee_id', employeeId)
      }

      if (domain) {
        query = query.eq('asset.category.domain', domain)
      }

      const { data, error } = await query
      if (error) throw error
      return data as OverdueAssignment[]
    },
  })
}

export function useHrRecentAssignments(enabled: boolean) {
  return useQuery({
    queryKey: dashboardKeys.hrRecentAssignments(),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_assignments')
        .select(
          `
          *,
          asset:assets(name, asset_code),
          employee:employees(employee_number, user:users(full_name))
        `,
        )
        .order('assigned_date', { ascending: false })
        .limit(10)

      if (error) throw error
      return data as HrRecentAssignment[]
    },
  })
}

export function usePendingReturns(enabled: boolean) {
  return useQuery({
    queryKey: dashboardKeys.pendingReturns(),
    enabled,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('asset_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .not('expected_return_date', 'is', null)
        .lte('expected_return_date', addDaysIso(7))

      if (error) throw error
      return count ?? 0
    },
  })
}

export function useRecentAuditLogs(enabled: boolean) {
  return useQuery({
    queryKey: dashboardKeys.auditLogs(),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, user:users(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return data as AuditLogWithUser[]
    },
  })
}

export function useLostAssetsCount(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.lostCount(),
    enabled,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('assets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'lost')

      if (error) throw error
      return count ?? 0
    },
  })
}

export function useLocationsCount(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.locationsCount(),
    enabled,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('locations')
        .select('id', { count: 'exact', head: true })

      if (error) throw error
      return count ?? 0
    },
  })
}

export function calcUtilizationRate(stats: DashboardStats) {
  const pool = stats.permanent_assets
  if (pool <= 0) return 0
  return (stats.assigned_assets / pool) * 100
}

export function useDomainDashboardStats(domain: CategoryDomain, enabled: boolean) {
  return useQuery({
    queryKey: dashboardKeys.domainStats(domain),
    enabled,
    queryFn: async () => {
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('status, category:asset_categories!inner(domain)')
        .eq('category.domain', domain)
        .eq('asset_type', 'permanent')

      if (assetsError) throw assetsError

      const rows = assets ?? []
      const stats: DomainDashboardStats = {
        total: rows.length,
        available: rows.filter((a) => a.status === 'available').length,
        assigned: rows.filter((a) => a.status === 'assigned').length,
        maintenance: rows.filter((a) => a.status === 'under_maintenance').length,
        overdue: 0,
      }

      const { count, error: overdueError } = await supabase
        .from('asset_assignments')
        .select('id, asset:assets!inner(category:asset_categories!inner(domain))', {
          count: 'exact',
          head: true,
        })
        .eq('is_active', true)
        .not('expected_return_date', 'is', null)
        .lt('expected_return_date', todayIso())
        .eq('asset.category.domain', domain)

      if (overdueError) throw overdueError
      stats.overdue = count ?? 0

      return stats
    },
  })
}

export type DomainMaintenanceRecord = Tables<'maintenance_records'> & {
  asset: (Pick<Tables<'assets'>, 'name' | 'asset_code'> & {
    category: Pick<Tables<'asset_categories'>, 'domain'> | null
  }) | null
}

export function useDomainMaintenanceRecords(domain: CategoryDomain, enabled: boolean) {
  return useQuery({
    queryKey: dashboardKeys.domainMaintenance(domain),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select(
          `
          *,
          asset:assets!inner(name, asset_code, category:asset_categories!inner(domain))
        `,
        )
        .eq('asset.category.domain', domain)
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return data as DomainMaintenanceRecord[]
    },
  })
}

export function useRecentAssignments(enabled: boolean) {
  return useQuery({
    queryKey: dashboardKeys.recentAssignments(),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_assignments')
        .select(
          `
          *,
          asset:assets(name, asset_code),
          employee:employees(employee_number, user:users(full_name))
        `,
        )
        .order('assigned_date', { ascending: false })
        .limit(10)

      if (error) throw error
      return data as HrRecentAssignment[]
    },
  })
}

export function useEmployeeRecentActivity(employeeId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: dashboardKeys.employeeActivity(employeeId ?? ''),
    enabled: enabled && Boolean(employeeId),
    queryFn: async () => {
      const [assignmentsRes, requestsRes] = await Promise.all([
        supabase
          .from('asset_assignments')
          .select('*, asset:assets(name, asset_code)')
          .eq('employee_id', employeeId!)
          .order('assigned_date', { ascending: false })
          .limit(10),
        supabase
          .from('requests')
          .select('*, category:asset_categories(name)')
          .eq('employee_id', employeeId!)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      if (assignmentsRes.error) throw assignmentsRes.error
      if (requestsRes.error) throw requestsRes.error

      const activities: EmployeeActivityItem[] = []

      for (const assignment of assignmentsRes.data ?? []) {
        const asset = assignment.asset as { name: string; asset_code: string } | null
        activities.push({
          id: assignment.id,
          type: 'assignment',
          title: asset?.name ?? 'Asset assignment',
          subtitle: asset?.asset_code ?? '',
          status: assignment.is_active ? 'active' : 'returned',
          date: assignment.assigned_date,
        })
      }

      for (const request of requestsRes.data ?? []) {
        const category = request.category as { name: string } | null
        activities.push({
          id: request.id,
          type: 'request',
          title: category?.name ?? 'Asset request',
          subtitle: `Qty: ${request.quantity}`,
          status: request.status,
          date: request.created_at,
        })
      }

      return activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
    },
  })
}

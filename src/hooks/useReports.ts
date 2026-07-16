import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export const reportKeys = {
  all: ['reports'] as const,
  utilization: () => [...reportKeys.all, 'utilization'] as const,
  employeeCoverage: () => [...reportKeys.all, 'employee-coverage'] as const,
  employeeAssets: () => [...reportKeys.all, 'employee-assets'] as const,
  warrantyExpiring: (days: number) => [...reportKeys.all, 'warranty-expiring', days] as const,
  overdueAssignments: () => [...reportKeys.all, 'overdue-assignments'] as const,
  departmentAssets: () => [...reportKeys.all, 'department-assets'] as const,
  purchaseHistory: () => [...reportKeys.all, 'purchase-history'] as const,
  disposalHistory: () => [...reportKeys.all, 'disposal-history'] as const,
  disposableConsumption: () => [...reportKeys.all, 'disposable-consumption'] as const,
  maintenanceCosts: () => [...reportKeys.all, 'maintenance-costs'] as const,
}

export type UtilizationReport = {
  byStatus: { status: string; count: number }[]
  byType: { asset_type: string; count: number }[]
  byDomain: { domain: string; count: number }[]
}

export type EmployeeCoverageRecord = {
  employee_id: string
  employee_number: string
  full_name: string
  email: string
  department_name: string
  active_assignments: number
  has_coverage: boolean
}

export type ActiveAssignment = Tables<'asset_assignments'> & {
  asset: Pick<Tables<'assets'>, 'id' | 'name' | 'asset_code' | 'asset_type' | 'status'> | null
  employee: (Tables<'employees'> & {
    user: Pick<Tables<'users'>, 'full_name' | 'email'> | null
    department: Pick<Tables<'departments'>, 'id' | 'name'> | null
  }) | null
}

export type WarrantyExpiringRecord = Tables<'assets'> & {
  category: Pick<Tables<'asset_categories'>, 'name' | 'domain'> | null
}

export type OverdueAssignmentRecord = Tables<'asset_assignments'> & {
  asset: Pick<Tables<'assets'>, 'asset_code' | 'name' | 'asset_type'> | null
  employee: (Pick<Tables<'employees'>, 'employee_number'> & {
    user: Pick<Tables<'users'>, 'full_name' | 'email'> | null
    department: Pick<Tables<'departments'>, 'name'> | null
  }) | null
}

export type DepartmentAssetSummary = {
  department_id: string
  department_name: string
  asset_count: number
  employees_with_assets: number
}

export type PurchaseRecord = {
  id: string
  source: 'transaction' | 'asset'
  asset_code: string
  asset_name: string
  quantity: number
  date: string
  notes: string | null
  price: number | null
}

export type DisposalRecord = Tables<'asset_transactions'> & {
  asset: Pick<Tables<'assets'>, 'asset_code' | 'name'> | null
  performer: Pick<Tables<'users'>, 'full_name'> | null
}

export type DisposableConsumptionRecord = {
  id: string
  source: 'distribution' | 'stock_out'
  asset_code: string
  asset_name: string
  quantity: number
  date: string
  recipient: string
  notes: string | null
}

export type MaintenanceCostRecord = Tables<'maintenance_records'> & {
  asset: Pick<Tables<'assets'>, 'asset_code' | 'name'> | null
}

export type MaintenanceCostSummary = {
  asset_id: string
  asset_code: string
  asset_name: string
  record_count: number
  total_cost: number
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function addDaysIso(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function countByField<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = getKey(item)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
}

export function useAssetUtilizationReport() {
  return useQuery({
    queryKey: reportKeys.utilization(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('status, asset_type, category:asset_categories(domain)')
      if (error) throw error

      const byStatus = countByField(data ?? [], (asset) => asset.status).map(({ key, count }) => ({
        status: key,
        count,
      }))

      const byType = countByField(data ?? [], (asset) => asset.asset_type).map(({ key, count }) => ({
        asset_type: key,
        count,
      }))

      const byDomain = countByField(
        data ?? [],
        (asset) => (asset.category as { domain: string } | null)?.domain ?? 'unassigned',
      ).map(({ key, count }) => ({
        domain: key,
        count,
      }))

      return { byStatus, byType, byDomain } satisfies UtilizationReport
    },
  })
}

export function useEmployeeCoverageReport() {
  return useQuery({
    queryKey: reportKeys.employeeCoverage(),
    queryFn: async () => {
      const [employeesRes, assignmentsRes] = await Promise.all([
        supabase
          .from('employees')
          .select(
            `
            id,
            employee_number,
            user:users(full_name, email),
            department:departments(name)
          `,
          )
          .eq('status', 'active')
          .order('employee_number', { ascending: true }),
        supabase
          .from('asset_assignments')
          .select('employee_id')
          .eq('is_active', true),
      ])

      if (employeesRes.error) throw employeesRes.error
      if (assignmentsRes.error) throw assignmentsRes.error

      const assignmentCounts = new Map<string, number>()
      for (const row of assignmentsRes.data ?? []) {
        assignmentCounts.set(row.employee_id, (assignmentCounts.get(row.employee_id) ?? 0) + 1)
      }

      return (employeesRes.data ?? []).map((employee) => {
        const user = employee.user as { full_name: string; email: string } | null
        const department = employee.department as { name: string } | null
        const activeAssignments = assignmentCounts.get(employee.id) ?? 0

        return {
          employee_id: employee.id,
          employee_number: employee.employee_number,
          full_name: user?.full_name ?? '',
          email: user?.email ?? '',
          department_name: department?.name ?? 'Unassigned',
          active_assignments: activeAssignments,
          has_coverage: activeAssignments > 0,
        } satisfies EmployeeCoverageRecord
      })
    },
  })
}

export function useEmployeeAssetsReport() {
  return useQuery({
    queryKey: reportKeys.employeeAssets(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_assignments')
        .select(
          `
          *,
          asset:assets(id, name, asset_code, asset_type, status),
          employee:employees(
            *,
            user:users(full_name, email),
            department:departments(id, name)
          )
        `,
        )
        .eq('is_active', true)
        .order('assigned_date', { ascending: false })

      if (error) throw error
      return data as ActiveAssignment[]
    },
  })
}

export function useWarrantyExpiringReport(days: number) {
  return useQuery({
    queryKey: reportKeys.warrantyExpiring(days),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*, category:asset_categories(name, domain)')
        .not('warranty_expiry', 'is', null)
        .gte('warranty_expiry', todayIso())
        .lte('warranty_expiry', addDaysIso(days))
        .order('warranty_expiry', { ascending: true })

      if (error) throw error
      return data as WarrantyExpiringRecord[]
    },
  })
}

export function useOverdueAssignmentsReport() {
  return useQuery({
    queryKey: reportKeys.overdueAssignments(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_assignments')
        .select(
          `
          *,
          asset:assets(asset_code, name, asset_type),
          employee:employees(
            employee_number,
            user:users(full_name, email),
            department:departments(name)
          )
        `,
        )
        .eq('is_active', true)
        .not('expected_return_date', 'is', null)
        .lt('expected_return_date', todayIso())
        .order('expected_return_date', { ascending: true })

      if (error) throw error
      return data as OverdueAssignmentRecord[]
    },
  })
}

export function useDepartmentAssetsReport() {
  return useQuery({
    queryKey: reportKeys.departmentAssets(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_assignments')
        .select(
          `
          id,
          employee:employees(
            id,
            department_id,
            department:departments(id, name)
          )
        `,
        )
        .eq('is_active', true)

      if (error) throw error

      const summaryMap = new Map<string, DepartmentAssetSummary>()
      const employeesPerDept = new Map<string, Set<string>>()

      for (const row of data ?? []) {
        const employee = row.employee as {
          id?: string
          department_id: string | null
          department: { id: string; name: string } | null
        } | null

        const deptId = employee?.department_id ?? 'unassigned'
        const deptName = employee?.department?.name ?? 'Unassigned'

        const existing = summaryMap.get(deptId) ?? {
          department_id: deptId,
          department_name: deptName,
          asset_count: 0,
          employees_with_assets: 0,
        }

        existing.asset_count += 1
        summaryMap.set(deptId, existing)

        if (employee?.id) {
          const empSet = employeesPerDept.get(deptId) ?? new Set()
          empSet.add(employee.id)
          employeesPerDept.set(deptId, empSet)
        }
      }

      return [...summaryMap.values()]
        .map((item) => ({
          ...item,
          employees_with_assets: employeesPerDept.get(item.department_id)?.size ?? 0,
        }))
        .sort((a, b) => b.asset_count - a.asset_count)
    },
  })
}

export function usePurchaseHistoryReport() {
  return useQuery({
    queryKey: reportKeys.purchaseHistory(),
    queryFn: async () => {
      const [txRes, assetsRes] = await Promise.all([
        supabase
          .from('asset_transactions')
          .select('*, asset:assets(asset_code, name, purchase_price)')
          .eq('transaction_type', 'purchase')
          .order('created_at', { ascending: false }),
        supabase
          .from('assets')
          .select('id, asset_code, name, purchase_date, purchase_price, quantity')
          .not('purchase_date', 'is', null)
          .order('purchase_date', { ascending: false }),
      ])

      if (txRes.error) throw txRes.error
      if (assetsRes.error) throw assetsRes.error

      const records: PurchaseRecord[] = []

      for (const tx of txRes.data ?? []) {
        const asset = tx.asset as { asset_code: string; name: string; purchase_price: number | null } | null
        records.push({
          id: `tx-${tx.id}`,
          source: 'transaction',
          asset_code: asset?.asset_code ?? '',
          asset_name: asset?.name ?? '',
          quantity: tx.quantity,
          date: tx.created_at,
          notes: tx.notes,
          price: asset?.purchase_price ?? null,
        })
      }

      for (const asset of assetsRes.data ?? []) {
        records.push({
          id: `asset-${asset.id}`,
          source: 'asset',
          asset_code: asset.asset_code,
          asset_name: asset.name,
          quantity: asset.quantity,
          date: asset.purchase_date!,
          notes: null,
          price: asset.purchase_price,
        })
      }

      return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    },
  })
}

export function useDisposalHistoryReport() {
  return useQuery({
    queryKey: reportKeys.disposalHistory(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_transactions')
        .select('*, asset:assets(asset_code, name), performer:users(full_name)')
        .eq('transaction_type', 'disposal')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as DisposalRecord[]
    },
  })
}

export function useDisposableConsumptionReport() {
  return useQuery({
    queryKey: reportKeys.disposableConsumption(),
    queryFn: async () => {
      const { data: distributions, error: distError } = await supabase
        .from('distributions')
        .select(
          `
          *,
          asset:assets(asset_code, name),
          employee:employees(user:users(full_name)),
          department:departments(name)
        `,
        )
        .order('distributed_at', { ascending: false })

      if (!distError && (distributions?.length ?? 0) > 0) {
        return (distributions ?? []).map((row) => {
          const asset = row.asset as { asset_code: string; name: string } | null
          const employee = row.employee as { user: { full_name: string } | null } | null
          const department = row.department as { name: string } | null

          const recipient = employee?.user?.full_name ?? department?.name ?? '—'

          return {
            id: row.id,
            source: 'distribution' as const,
            asset_code: asset?.asset_code ?? '',
            asset_name: asset?.name ?? '',
            quantity: row.quantity,
            date: row.distributed_at,
            recipient,
            notes: row.notes,
          } satisfies DisposableConsumptionRecord
        })
      }

      const { data: stockOut, error: stockError } = await supabase
        .from('asset_transactions')
        .select('*, asset:assets(asset_code, name), performer:users(full_name)')
        .eq('transaction_type', 'stock_out')
        .order('created_at', { ascending: false })

      if (stockError) throw stockError

      return (stockOut ?? []).map((row) => {
        const asset = row.asset as { asset_code: string; name: string } | null
        const performer = row.performer as { full_name: string } | null

        return {
          id: row.id,
          source: 'stock_out' as const,
          asset_code: asset?.asset_code ?? '',
          asset_name: asset?.name ?? '',
          quantity: row.quantity,
          date: row.created_at,
          recipient: performer?.full_name ?? '—',
          notes: row.notes,
        } satisfies DisposableConsumptionRecord
      })
    },
  })
}

export function useMaintenanceCostsReport() {
  return useQuery({
    queryKey: reportKeys.maintenanceCosts(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('*, asset:assets(asset_code, name)')
        .order('created_at', { ascending: false })

      if (error) throw error

      const records = data as MaintenanceCostRecord[]
      const summaryMap = new Map<string, MaintenanceCostSummary>()

      for (const record of records) {
        const asset = record.asset
        const existing = summaryMap.get(record.asset_id) ?? {
          asset_id: record.asset_id,
          asset_code: asset?.asset_code ?? '',
          asset_name: asset?.name ?? '',
          record_count: 0,
          total_cost: 0,
        }

        existing.record_count += 1
        existing.total_cost += record.cost ?? 0
        summaryMap.set(record.asset_id, existing)
      }

      return {
        records,
        summary: [...summaryMap.values()].sort((a, b) => b.total_cost - a.total_cost),
      }
    },
  })
}

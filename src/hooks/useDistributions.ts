import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { assetKeys } from '@/hooks/useAssets'
import { supabase } from '@/lib/supabase'
import type { Inserts, Tables } from '@/types/database'

export const distributionKeys = {
  all: ['distributions'] as const,
  lists: () => [...distributionKeys.all, 'list'] as const,
  disposableAssets: ['disposable-assets-for-distribution'] as const,
  activeEmployees: ['active-employees-for-distribution'] as const,
  activeDepartments: ['active-departments-for-distribution'] as const,
}

export type DistributionWithRelations = Tables<'distributions'> & {
  asset: Pick<Tables<'assets'>, 'id' | 'name' | 'asset_code' | 'quantity'> | null
  employee: (Pick<Tables<'employees'>, 'id' | 'employee_number'> & {
    user: Pick<Tables<'users'>, 'full_name'> | null
  }) | null
  department: Pick<Tables<'departments'>, 'id' | 'name'> | null
  distributed_by_user: Pick<Tables<'users'>, 'full_name'> | null
}

export type DisposableAsset = Pick<Tables<'assets'>, 'id' | 'asset_code' | 'name' | 'quantity'>

export type DistributionEmployee = Pick<Tables<'employees'>, 'id' | 'employee_number'> & {
  user: Pick<Tables<'users'>, 'full_name'> | null
}

export type DistributionDepartment = Pick<Tables<'departments'>, 'id' | 'name'>

export function useDistributions() {
  return useQuery({
    queryKey: distributionKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('distributions')
        .select(
          `
          *,
          asset:assets(id, name, asset_code, quantity),
          employee:employees(id, employee_number, user:users(full_name)),
          department:departments(id, name),
          distributed_by_user:users!distributed_by(full_name)
        `,
        )
        .order('distributed_at', { ascending: false })

      if (error) throw error
      return data as DistributionWithRelations[]
    },
  })
}

export function useDisposableAssetsForDistribution() {
  return useQuery({
    queryKey: distributionKeys.disposableAssets,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('id, asset_code, name, quantity')
        .eq('asset_type', 'disposable')
        .gt('quantity', 0)
        .order('name', { ascending: true })

      if (error) throw error
      return data as DisposableAsset[]
    },
  })
}

export function useActiveEmployeesForDistribution() {
  return useQuery({
    queryKey: distributionKeys.activeEmployees,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_number, user:users(full_name)')
        .eq('status', 'active')
        .order('employee_number', { ascending: true })

      if (error) throw error
      return data as DistributionEmployee[]
    },
  })
}

export function useActiveDepartmentsForDistribution() {
  return useQuery({
    queryKey: distributionKeys.activeDepartments,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      return data as DistributionDepartment[]
    },
  })
}

export function useCreateDistribution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Inserts<'distributions'>) => {
      // DB trigger deducts stock + creates stock_out transaction
      const { data, error } = await supabase
        .from('distributions')
        .insert(payload)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: distributionKeys.all })
      queryClient.invalidateQueries({ queryKey: distributionKeys.disposableAssets })
      queryClient.invalidateQueries({ queryKey: assetKeys.all })
    },
  })
}

export function useDeleteDistribution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // DB trigger restores stock on delete
      const { error } = await supabase.from('distributions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: distributionKeys.all })
      queryClient.invalidateQueries({ queryKey: distributionKeys.disposableAssets })
      queryClient.invalidateQueries({ queryKey: assetKeys.all })
    },
  })
}

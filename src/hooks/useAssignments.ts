import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { assetKeys } from '@/hooks/useAssets'
import { supabase } from '@/lib/supabase'
import type { Inserts, Tables, Updates } from '@/types/database'

export const assignmentKeys = {
  all: ['assignments'] as const,
  lists: () => [...assignmentKeys.all, 'list'] as const,
  list: (filter: AssignmentFilter) => [...assignmentKeys.lists(), filter] as const,
  availableAssets: ['available-permanent-assets'] as const,
  activeEmployees: ['active-employees-for-assignment'] as const,
  activeLocations: ['active-locations-for-assignment'] as const,
}

export type AssignmentFilter = 'active' | 'returned' | 'overdue' | 'all'

export type AssignmentLocation = Pick<Tables<'locations'>, 'id' | 'building' | 'floor' | 'room'>

export type AssignmentWithRelations = Tables<'asset_assignments'> & {
  asset: Pick<Tables<'assets'>, 'id' | 'name' | 'asset_code' | 'status'> | null
  employee: (Pick<Tables<'employees'>, 'id' | 'employee_number'> & {
    user: Pick<Tables<'users'>, 'full_name'> | null
  }) | null
  assigned_by_user: Pick<Tables<'users'>, 'full_name'> | null
  location: AssignmentLocation | null
}

export type AvailableAsset = Pick<Tables<'assets'>, 'id' | 'asset_code' | 'name' | 'status'>

export type ActiveEmployee = Pick<Tables<'employees'>, 'id' | 'employee_number'> & {
  user: Pick<Tables<'users'>, 'full_name'> | null
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function useAssignments(filter: AssignmentFilter = 'all') {
  return useQuery({
    queryKey: assignmentKeys.list(filter),
    queryFn: async () => {
      let query = supabase
        .from('asset_assignments')
        .select(
          `
          *,
          asset:assets(id, name, asset_code, status),
          employee:employees(id, employee_number, user:users(full_name)),
          assigned_by_user:users!assigned_by(full_name),
          location:locations(id, building, floor, room)
        `,
        )
        .order('assigned_date', { ascending: false })

      if (filter === 'active') {
        query = query.eq('is_active', true)
      } else if (filter === 'returned') {
        query = query.eq('is_active', false)
      } else if (filter === 'overdue') {
        query = query
          .eq('is_active', true)
          .not('expected_return_date', 'is', null)
          .lt('expected_return_date', todayIso())
      }

      const { data, error } = await query
      if (error) throw error
      return data as AssignmentWithRelations[]
    },
  })
}

export function useAvailablePermanentAssets() {
  return useQuery({
    queryKey: assignmentKeys.availableAssets,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('id, asset_code, name, status')
        .eq('asset_type', 'permanent')
        .eq('status', 'available')
        .order('name', { ascending: true })

      if (error) throw error
      return data as AvailableAsset[]
    },
  })
}

export function useActiveEmployeesForAssignment() {
  return useQuery({
    queryKey: assignmentKeys.activeEmployees,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_number, user:users(full_name)')
        .eq('status', 'active')
        .order('employee_number', { ascending: true })

      if (error) throw error
      return data as ActiveEmployee[]
    },
  })
}

export function useActiveLocationsForAssignment() {
  return useQuery({
    queryKey: assignmentKeys.activeLocations,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, building, floor, room')
        .eq('is_active', true)
        .order('building', { ascending: true })
        .order('floor', { ascending: true })

      if (error) throw error
      return data as AssignmentLocation[]
    },
  })
}

export function useCreateAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Inserts<'asset_assignments'>) => {
      // DB trigger syncs asset status + creates assignment transaction
      const { data, error } = await supabase
        .from('asset_assignments')
        .insert(payload)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all })
      queryClient.invalidateQueries({ queryKey: assignmentKeys.availableAssets })
      queryClient.invalidateQueries({ queryKey: assetKeys.all })
    },
  })
}

export function useReturnAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      assetId,
      ...payload
    }: Updates<'asset_assignments'> & {
      id: string
      assetId: string
    }) => {
      // DB trigger syncs asset status + creates return transaction
      const { data, error } = await supabase
        .from('asset_assignments')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all })
      queryClient.invalidateQueries({ queryKey: assignmentKeys.availableAssets })
      queryClient.invalidateQueries({ queryKey: assetKeys.all })
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.assetId) })
    },
  })
}

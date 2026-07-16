import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { assetKeys } from '@/hooks/useAssets'
import { supabase } from '@/lib/supabase'
import type { Inserts, MaintenanceStatus, Tables, Updates } from '@/types/database'

export const maintenanceKeys = {
  all: ['maintenance'] as const,
  lists: () => [...maintenanceKeys.all, 'list'] as const,
  list: (reportedBy?: string) => [...maintenanceKeys.lists(), { reportedBy }] as const,
  assignedAssets: (employeeId?: string) => [...maintenanceKeys.all, 'assigned-assets', employeeId] as const,
}

export type MaintenanceWithRelations = Tables<'maintenance_records'> & {
  asset: Pick<Tables<'assets'>, 'id' | 'name' | 'asset_code' | 'status'> | null
  reported_by_user: Pick<Tables<'users'>, 'full_name'> | null
}

export type AssignedAsset = Pick<Tables<'assets'>, 'id' | 'asset_code' | 'name' | 'status'>

export function useMaintenanceRecords(reportedBy?: string) {
  return useQuery({
    queryKey: maintenanceKeys.list(reportedBy),
    queryFn: async () => {
      let query = supabase
        .from('maintenance_records')
        .select(
          `
          *,
          asset:assets(id, name, asset_code, status),
          reported_by_user:users!reported_by(full_name)
        `,
        )
        .order('created_at', { ascending: false })

      if (reportedBy) {
        query = query.eq('reported_by', reportedBy)
      }

      const { data, error } = await query
      if (error) throw error
      return data as MaintenanceWithRelations[]
    },
  })
}

export function useEmployeeAssignedAssets(employeeId: string | undefined) {
  return useQuery({
    queryKey: maintenanceKeys.assignedAssets(employeeId),
    enabled: Boolean(employeeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_assignments')
        .select('asset:assets(id, asset_code, name, status)')
        .eq('employee_id', employeeId!)
        .is('returned_date', null)

      if (error) throw error

      return (data as { asset: AssignedAsset | null }[])
        .map((row) => row.asset)
        .filter((asset): asset is AssignedAsset => asset !== null)
    },
  })
}

export function useCreateMaintenance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Inserts<'maintenance_records'>) => {
      const { data, error } = await supabase
        .from('maintenance_records')
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      const status = payload.status ?? 'open'
      if (status === 'open' || status === 'in_progress') {
        const { error: assetError } = await supabase
          .from('assets')
          .update({ status: 'under_maintenance' })
          .eq('id', payload.asset_id)

        if (assetError) throw assetError
      } else if (status === 'completed') {
        const { error: assetError } = await supabase
          .from('assets')
          .update({ status: 'available' })
          .eq('id', payload.asset_id)

        if (assetError) throw assetError
      }

      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all })
      queryClient.invalidateQueries({ queryKey: assetKeys.all })
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.asset_id) })
    },
  })
}

export function useUpdateMaintenance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      assetId,
      previousStatus,
      ...payload
    }: Updates<'maintenance_records'> & {
      id: string
      assetId: string
      previousStatus: MaintenanceStatus
    }) => {
      const { data, error } = await supabase
        .from('maintenance_records')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      if (payload.status === 'completed' && previousStatus !== 'completed') {
        const { error: assetError } = await supabase
          .from('assets')
          .update({ status: 'available' })
          .eq('id', assetId)

        if (assetError) throw assetError
      } else if (payload.status && payload.status !== 'completed' && previousStatus === 'completed') {
        const { error: assetError } = await supabase
          .from('assets')
          .update({ status: 'under_maintenance' })
          .eq('id', assetId)

        if (assetError) throw assetError
      }

      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all })
      queryClient.invalidateQueries({ queryKey: assetKeys.all })
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.assetId) })
    },
  })
}

export function useDeleteMaintenance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, assetId }: { id: string; assetId: string }) => {
      const { error } = await supabase.from('maintenance_records').delete().eq('id', id)
      if (error) throw error

      const { count, error: countError } = await supabase
        .from('maintenance_records')
        .select('id', { count: 'exact', head: true })
        .eq('asset_id', assetId)
        .in('status', ['open', 'in_progress'])

      if (countError) throw countError

      if (count === 0) {
        const { error: assetError } = await supabase
          .from('assets')
          .update({ status: 'available' })
          .eq('id', assetId)

        if (assetError) throw assetError
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all })
      queryClient.invalidateQueries({ queryKey: assetKeys.all })
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.assetId) })
    },
  })
}

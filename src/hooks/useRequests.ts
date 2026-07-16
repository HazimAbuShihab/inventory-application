import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { Inserts, RequestStatus, Tables } from '@/types/database'

export const requestKeys = {
  all: ['requests'] as const,
  lists: () => [...requestKeys.all, 'list'] as const,
  list: (employeeId?: string) => [...requestKeys.lists(), { employeeId }] as const,
}

export type RequestWithRelations = Tables<'requests'> & {
  employee: (Pick<Tables<'employees'>, 'id' | 'employee_number'> & {
    user: Pick<Tables<'users'>, 'full_name'> | null
  }) | null
  category: Pick<Tables<'asset_categories'>, 'id' | 'name'> | null
  approved_by_user: Pick<Tables<'users'>, 'full_name'> | null
}

export function useRequests(employeeId?: string) {
  return useQuery({
    queryKey: requestKeys.list(employeeId),
    queryFn: async () => {
      let query = supabase
        .from('requests')
        .select(
          `
          *,
          employee:employees(id, employee_number, user:users(full_name)),
          category:asset_categories(id, name),
          approved_by_user:users!approved_by(full_name)
        `,
        )
        .order('created_at', { ascending: false })

      if (employeeId) {
        query = query.eq('employee_id', employeeId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as RequestWithRelations[]
    },
  })
}

export function useCreateRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Inserts<'requests'>) => {
      const { data, error } = await supabase.from('requests').insert(payload).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.all })
    },
  })
}

export function useUpdateRequestStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
      approvedBy,
    }: {
      id: string
      status: Extract<RequestStatus, 'approved' | 'rejected'>
      approvedBy: string
    }) => {
      const { data, error } = await supabase
        .from('requests')
        .update({ status, approved_by: approvedBy })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.all })
    },
  })
}

export function useCancelRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('requests')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.all })
    },
  })
}

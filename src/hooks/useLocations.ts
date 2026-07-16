import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { Inserts, Tables, Updates } from '@/types/database'

export const locationKeys = {
  all: ['locations'] as const,
  list: (activeOnly?: boolean) => [...locationKeys.all, { activeOnly: activeOnly ?? false }] as const,
}

export function useLocations(options?: { activeOnly?: boolean }) {
  const activeOnly = options?.activeOnly ?? false

  return useQuery({
    queryKey: locationKeys.list(activeOnly),
    queryFn: async () => {
      let query = supabase
        .from('locations')
        .select('*')
        .order('building', { ascending: true })
        .order('floor', { ascending: true })
        .order('room', { ascending: true })

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Tables<'locations'>[]
    },
  })
}

export function useCreateLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Inserts<'locations'>) => {
      const { data, error } = await supabase.from('locations').insert(payload).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all })
    },
  })
}

export function useUpdateLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }: Updates<'locations'> & { id: string }) => {
      const { data, error } = await supabase.from('locations').update(payload).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all })
    },
  })
}

export function useDeactivateLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('locations')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all })
    },
  })
}

export function useActivateLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('locations')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all })
    },
  })
}

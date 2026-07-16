import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { Inserts, Tables, Updates } from '@/types/database'

export const categoryKeys = {
  all: ['categories'] as const,
}

export const subcategoryKeys = {
  all: ['subcategories'] as const,
  byCategory: (categoryId?: string) => [...subcategoryKeys.all, categoryId ?? 'all'] as const,
}

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_categories')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      return data as Tables<'asset_categories'>[]
    },
  })
}

export function useSubcategories(categoryId?: string) {
  return useQuery({
    queryKey: subcategoryKeys.byCategory(categoryId),
    queryFn: async () => {
      let query = supabase
        .from('asset_subcategories')
        .select('*')
        .order('name', { ascending: true })

      if (categoryId) {
        query = query.eq('category_id', categoryId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Tables<'asset_subcategories'>[]
    },
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Inserts<'asset_categories'>) => {
      const { data, error } = await supabase.from('asset_categories').insert(payload).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }: Updates<'asset_categories'> & { id: string }) => {
      const { data, error } = await supabase
        .from('asset_categories')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

export function useDeactivateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('asset_categories')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

export function useActivateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('asset_categories')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

export function useCreateSubcategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Inserts<'asset_subcategories'>) => {
      const { data, error } = await supabase.from('asset_subcategories').insert(payload).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subcategoryKeys.all })
    },
  })
}

export function useUpdateSubcategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }: Updates<'asset_subcategories'> & { id: string }) => {
      const { data, error } = await supabase
        .from('asset_subcategories')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subcategoryKeys.all })
    },
  })
}

export function useDeactivateSubcategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('asset_subcategories')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subcategoryKeys.all })
    },
  })
}

export function useActivateSubcategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('asset_subcategories')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subcategoryKeys.all })
    },
  })
}

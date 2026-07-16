import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { toIlikeTerm } from '@/lib/utils'
import type {
  AssetStatus,
  AssetType,
  Inserts,
  Tables,
  TransactionType,
  Updates,
} from '@/types/database'

export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (filters: AssetFilters) => [...assetKeys.lists(), filters] as const,
  page: (filters: AssetFilters, page: number, pageSize: number) =>
    [...assetKeys.lists(), filters, page, pageSize] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
}

export type AssetFilters = {
  search?: string
  categoryId?: string
  assetType?: AssetType | 'all'
  status?: AssetStatus | 'all'
}

export type AssetWithCategory = Tables<'assets'> & {
  category: Tables<'asset_categories'> | null
}

export type AssignmentWithEmployee = Tables<'asset_assignments'> & {
  employee: (Tables<'employees'> & { user: Pick<Tables<'users'>, 'full_name' | 'email'> | null }) | null
  location: Pick<Tables<'locations'>, 'building' | 'floor' | 'room'> | null
}

export type AssetDetail = Tables<'assets'> & {
  category: Tables<'asset_categories'> | null
  assignments: AssignmentWithEmployee[]
  transactions: Tables<'asset_transactions'>[]
}

function buildAssetQuery(filters: AssetFilters, withCount: boolean) {
  let query = supabase
    .from('assets')
    .select('*, category:asset_categories(*)', withCount ? { count: 'exact' } : undefined)
    .order('created_at', { ascending: false })

  if (filters.categoryId && filters.categoryId !== 'all') {
    query = query.eq('category_id', filters.categoryId)
  }
  if (filters.assetType && filters.assetType !== 'all') {
    query = query.eq('asset_type', filters.assetType)
  }
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters.search?.trim()) {
    const term = toIlikeTerm(filters.search)
    if (term) {
      query = query.or(`name.ilike.${term},asset_code.ilike.${term},serial_number.ilike.${term}`)
    }
  }

  return query
}

export async function fetchAssets(filters: AssetFilters = {}) {
  const { data, error } = await buildAssetQuery(filters, false)
  if (error) throw error
  return data as AssetWithCategory[]
}

export function useAssets(filters: AssetFilters = {}) {
  return useQuery({
    queryKey: assetKeys.list(filters),
    queryFn: () => fetchAssets(filters),
  })
}

export type PagedAssets = {
  rows: AssetWithCategory[]
  totalCount: number
}

export function usePagedAssets(filters: AssetFilters, page: number, pageSize = 25) {
  return useQuery({
    queryKey: assetKeys.page(filters, page, pageSize),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const from = page * pageSize
      const { data, error, count } = await buildAssetQuery(filters, true).range(from, from + pageSize - 1)
      if (error) throw error
      return { rows: data as AssetWithCategory[], totalCount: count ?? 0 } satisfies PagedAssets
    },
  })
}

export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: assetKeys.detail(id ?? ''),
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select(
          `
          *,
          category:asset_categories(*),
          assignments:asset_assignments(
            *,
            employee:employees(
              *,
              user:users(full_name, email)
            ),
            location:locations(building, floor, room)
          ),
          transactions:asset_transactions(*)
        `,
        )
        .eq('id', id!)
        .single()

      if (error) throw error

      const detail = data as AssetDetail
      detail.transactions.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      detail.assignments.sort(
        (a, b) => new Date(b.assigned_date).getTime() - new Date(a.assigned_date).getTime(),
      )

      return detail
    },
  })
}

export function useCreateAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Inserts<'assets'>) => {
      const { data, error } = await supabase.from('assets').insert(payload).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all })
    },
  })
}

export function useUpdateAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }: Updates<'assets'> & { id: string }) => {
      const { data, error } = await supabase.from('assets').update(payload).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all })
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(data.id) })
    },
  })
}

export function useDeleteAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all })
    },
  })
}

export function useReportAssetIssue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      assetId,
      status,
      issueDescription,
      reportedBy,
      createMaintenance,
    }: {
      assetId: string
      status: 'damaged' | 'lost'
      issueDescription: string
      reportedBy: string
      createMaintenance: boolean
    }) => {
      const { error: assetError } = await supabase
        .from('assets')
        .update({ status })
        .eq('id', assetId)

      if (assetError) throw assetError

      if (createMaintenance) {
        const { error: maintenanceError } = await supabase.from('maintenance_records').insert({
          asset_id: assetId,
          issue_description: issueDescription,
          status: 'open',
          reported_by: reportedBy,
        })
        if (maintenanceError) throw maintenanceError
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all })
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.assetId) })
    },
  })
}

export function useStockTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      assetId,
      transactionType,
      quantity,
      notes,
      performedBy,
      currentQuantity,
    }: {
      assetId: string
      transactionType: Extract<TransactionType, 'stock_in' | 'stock_out'>
      quantity: number
      notes?: string
      performedBy: string
      currentQuantity: number
    }) => {
      if (transactionType === 'stock_out' && quantity > currentQuantity) {
        throw new Error('Insufficient stock for this transaction')
      }

      // DB trigger adjusts asset quantity for disposable stock movements
      const { error: txError } = await supabase.from('asset_transactions').insert({
        asset_id: assetId,
        transaction_type: transactionType,
        quantity,
        performed_by: performedBy,
        notes: notes ?? null,
      })

      if (txError) throw txError

      return transactionType === 'stock_in'
        ? currentQuantity + quantity
        : currentQuantity - quantity
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all })
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.assetId) })
    },
  })
}

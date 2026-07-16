import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { Inserts, Tables, Updates } from '@/types/database'

export const employeeKeys = {
  all: ['employees'] as const,
  usersWithoutEmployee: ['users-without-employee'] as const,
}

export type EmployeeWithRelations = Tables<'employees'> & {
  user: Pick<Tables<'users'>, 'full_name' | 'email'> | null
  department: Pick<Tables<'departments'>, 'id' | 'name'> | null
  work_location: Pick<Tables<'locations'>, 'id' | 'building' | 'floor' | 'room'> | null
}

export type UserWithoutEmployee = Pick<Tables<'users'>, 'id' | 'full_name' | 'email'>

export function useEmployees() {
  return useQuery({
    queryKey: employeeKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select(
          '*, user:users(full_name, email), department:departments(id, name), work_location:locations(id, building, floor, room)',
        )
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as EmployeeWithRelations[]
    },
  })
}

export function useUsersWithoutEmployee() {
  return useQuery({
    queryKey: employeeKeys.usersWithoutEmployee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, employee:employees(id)')

      if (error) throw error

      return (data as (UserWithoutEmployee & { employee: { id: string } | null })[])
        .filter((user) => !user.employee)
        .map(({ id, full_name, email }) => ({ id, full_name, email }))
    },
  })
}

export function useNextEmployeeNumber(enabled = false) {
  return useQuery({
    queryKey: ['next-employee-number'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('next_employee_number')
      if (error) throw error
      return data as string
    },
    enabled,
  })
}

export function useCreateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Inserts<'employees'>) => {
      const { data, error } = await supabase.from('employees').insert(payload).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all })
      queryClient.invalidateQueries({ queryKey: employeeKeys.usersWithoutEmployee })
    },
  })
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }: Updates<'employees'> & { id: string }) => {
      const { data, error } = await supabase.from('employees').update(payload).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all })
    },
  })
}

export function useActivateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase.rpc('activate_employee', { p_employee_id: employeeId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all })
    },
  })
}

export function useDeactivateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase.rpc('deactivate_employee', { p_employee_id: employeeId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all })
    },
  })
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employees').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all })
      queryClient.invalidateQueries({ queryKey: employeeKeys.usersWithoutEmployee })
    },
  })
}

export type EmployeeAssignment = Tables<'asset_assignments'> & {
  asset: Pick<
    Tables<'assets'>,
    'id' | 'name' | 'asset_code' | 'barcode' | 'serial_number' | 'status'
  > | null
  location: Pick<Tables<'locations'>, 'building' | 'floor' | 'room'> | null
}

export function useEmployeeAssignments(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee-assignments', employeeId],
    enabled: Boolean(employeeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_assignments')
        .select(
          `
          *,
          asset:assets(id, name, asset_code, barcode, serial_number, status),
          location:locations(building, floor, room)
        `,
        )
        .eq('employee_id', employeeId!)
        .order('assigned_date', { ascending: false })

      if (error) throw error
      return data as EmployeeAssignment[]
    },
  })
}

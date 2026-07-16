import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { Tables, UserRole } from '@/types/database'

export const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
  roles: () => ['roles'] as const,
}

export type UserWithRole = Tables<'users'> & {
  role: Pick<Tables<'roles'>, 'id' | 'name' | 'description'> | null
  department: Pick<Tables<'departments'>, 'id' | 'name'> | null
}

export type ProfileUpdatePayload = {
  full_name: string
  phone: string | null
  department_id: string | null
}

export type AdminCreateUserPayload = {
  p_email: string
  p_password: string
  p_full_name: string
  p_role_name: UserRole
  p_phone?: string | null
  p_department_id?: string | null
  p_employee_number?: string | null
  p_job_title?: string | null
}

export function useRoles() {
  return useQuery({
    queryKey: userKeys.roles(),
    queryFn: async () => {
      const { data, error } = await supabase.from('roles').select('*').order('name')
      if (error) throw error
      return data as Tables<'roles'>[]
    },
  })
}

export function useAllUsers(enabled: boolean) {
  return useQuery({
    queryKey: userKeys.list(),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*, role:roles(id, name, description), department:departments(id, name)')
        .order('full_name', { ascending: true })

      if (error) throw error
      return data as UserWithRole[]
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, ...payload }: ProfileUpdatePayload & { userId: string }) => {
      const { data, error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.list() })
    },
  })
}

export function useUpdateUserAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      role_id,
      status,
      full_name,
      email,
      phone,
    }: {
      id: string
      role_id?: string | null
      status?: string | null
      full_name?: string | null
      email?: string | null
      phone?: string | null
    }) => {
      const { data, error } = await supabase.rpc('admin_update_user', {
        p_user_id: id,
        p_role_id: role_id ?? null,
        p_status: status ?? null,
        p_full_name: full_name ?? null,
        p_email: email ?? null,
        p_phone: phone ?? null,
      })

      if (error) {
        const message = error.message.toLowerCase()
        if (message.includes('only super admins')) {
          throw new Error('Only super admins can update users.')
        }
        if (message.includes('already exists')) {
          throw new Error('A user with this email already exists.')
        }
        if (message.includes('invalid email')) {
          throw new Error('Invalid email address.')
        }
        if (message.includes('not found')) {
          throw new Error('User not found.')
        }
        throw new Error(error.message || 'Failed to update user.')
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.list() })
    },
  })
}

export function useAdminCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: AdminCreateUserPayload) => {
      const { data, error } = await supabase.rpc('admin_create_user', payload)

      if (error) {
        const message = error.message.toLowerCase()
        if (message.includes('duplicate') || message.includes('already exists')) {
          throw new Error('A user with this email already exists.')
        }
        if (message.includes('password')) {
          throw new Error('Password does not meet security requirements. Use at least 8 characters.')
        }
        if (message.includes('permission') || message.includes('denied')) {
          throw new Error('You do not have permission to create users.')
        }
        throw new Error(error.message || 'Failed to create user. Please check the form and try again.')
      }

      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.list() })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string
      newPassword: string
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('Not authenticated')

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (verifyError) throw new Error('Current password is incorrect')

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
    },
  })
}

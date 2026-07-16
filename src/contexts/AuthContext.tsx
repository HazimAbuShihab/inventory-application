import type { Session } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { supabase } from '@/lib/supabase'
import type { UserProfile, UserRole } from '@/types/database'

const INVENTORY_ADMIN_ROLES: UserRole[] = ['super_admin', 'inventory_admin', 'it_admin', 'facilities_admin']

interface AuthContextValue {
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  refreshProfile: () => Promise<void>
  hasRole: (...roles: UserRole[]) => boolean
  isAdmin: boolean
  isHr: boolean
  isInventoryAdmin: boolean
  isSuperAdmin: boolean
  canManageDomain: (domain: 'it' | 'facilities') => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*, role:roles(*), department:departments(*), employee:employees(*)')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Failed to fetch user profile:', error.message)
    return null
  }

  const row = data as UserProfile & { employee?: UserProfile['employee'] | UserProfile['employee'][] }
  const employee = Array.isArray(row.employee) ? (row.employee[0] ?? null) : (row.employee ?? null)

  return { ...row, employee }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const userProfile = await fetchProfile(userId)
    setProfile(userProfile)
  }, [])

  useEffect(() => {
    let mounted = true

    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return

      setSession(data.session)
      if (data.session?.user) {
        await loadProfile(data.session.user.id)
      }
      setLoading(false)
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.user) {
        await loadProfile(nextSession.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setSession(null)
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    return { error: error?.message ?? null }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      await loadProfile(session.user.id)
    }
  }, [session?.user, loadProfile])

  const roleName = profile?.role?.name as UserRole | undefined

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!roleName) return false
      return roles.includes(roleName)
    },
    [roleName],
  )

  const isSuperAdmin = roleName === 'super_admin'
  const isInventoryAdmin = roleName != null && INVENTORY_ADMIN_ROLES.includes(roleName)
  const isAdmin = isInventoryAdmin
  const isHr = roleName === 'hr'

  const canManageDomain = useCallback(
    (domain: 'it' | 'facilities') => {
      if (!roleName) return false
      if (roleName === 'super_admin' || roleName === 'inventory_admin') return true
      if (domain === 'it') return roleName === 'it_admin'
      if (domain === 'facilities') return roleName === 'facilities_admin'
      return false
    },
    [roleName],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      signIn,
      signOut,
      resetPassword,
      refreshProfile,
      hasRole,
      isAdmin,
      isHr,
      isInventoryAdmin,
      isSuperAdmin,
      canManageDomain,
    }),
    [
      session,
      profile,
      loading,
      signIn,
      signOut,
      resetPassword,
      refreshProfile,
      hasRole,
      isAdmin,
      isHr,
      isInventoryAdmin,
      isSuperAdmin,
      canManageDomain,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

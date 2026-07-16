import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { LoadingState } from '@/components/common/LoadingState'
import { useAuth } from '@/contexts/AuthContext'
import ForbiddenPage from '@/pages/ForbiddenPage'
import type { UserRole } from '@/types/database'

interface ProtectedRouteProps {
  roles?: UserRole[]
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { session, loading, hasRole } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingState fullPage message="Authenticating..." />
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && roles.length > 0 && !hasRole(...roles)) {
    return <ForbiddenPage />
  }

  return <Outlet />
}

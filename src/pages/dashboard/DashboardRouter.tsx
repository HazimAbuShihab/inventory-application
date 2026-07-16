import { Navigate } from 'react-router-dom'

import { LoadingState } from '@/components/common/LoadingState'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardRouter() {
  const { loading, isSuperAdmin, hasRole } = useAuth()

  if (loading) {
    return <LoadingState message="Loading dashboard..." />
  }

  if (isSuperAdmin) {
    return <Navigate to="/dashboard/admin" replace />
  }

  if (hasRole('it_admin', 'inventory_admin')) {
    return <Navigate to="/dashboard/it" replace />
  }

  if (hasRole('facilities_admin')) {
    return <Navigate to="/dashboard/facilities" replace />
  }

  if (hasRole('hr')) {
    return <Navigate to="/dashboard/hr" replace />
  }

  return <Navigate to="/dashboard/general" replace />
}

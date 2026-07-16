import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'

import { AppShell } from '@/components/layout/AppShell'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import Login from '@/pages/auth/Login'
import AssetDetailPage from '@/pages/assets/AssetDetailPage'
import AssetEditPage from '@/pages/assets/AssetEditPage'
import AssetNewPage from '@/pages/assets/AssetNewPage'
import AssetsPage from '@/pages/assets/AssetsPage'
import AssignmentsPage from '@/pages/AssignmentsPage'
import AuditLogsPage from '@/pages/AuditLogsPage'
import CategoriesPage from '@/pages/CategoriesPage'
import DashboardRouter from '@/pages/dashboard/DashboardRouter'
import GeneralDashboard from '@/pages/dashboard/GeneralDashboard'
import AdminDashboard from '@/pages/dashboard/AdminDashboard'
import ITDashboard from '@/pages/dashboard/ITDashboard'
import FacilitiesDashboard from '@/pages/dashboard/FacilitiesDashboard'
import HRDashboard from '@/pages/dashboard/HRDashboard'
import DepartmentsPage from '@/pages/DepartmentsPage'
import DistributionsPage from '@/pages/DistributionsPage'
import EmployeesPage from '@/pages/EmployeesPage'
import LocationsPage from '@/pages/LocationsPage'
import MaintenancePage from '@/pages/MaintenancePage'
import ReportsPage from '@/pages/ReportsPage'
import RequestsPage from '@/pages/RequestsPage'
import SettingsPage from '@/pages/SettingsPage'
import ProfilePage from '@/pages/ProfilePage'
import NotFoundPage from '@/pages/NotFoundPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardRouter />} />
                <Route path="dashboard/general" element={<GeneralDashboard />} />

                <Route element={<ProtectedRoute roles={['super_admin']} />}>
                  <Route path="dashboard/admin" element={<AdminDashboard />} />
                </Route>

                <Route
                  element={
                    <ProtectedRoute roles={['super_admin', 'it_admin', 'inventory_admin']} />
                  }
                >
                  <Route path="dashboard/it" element={<ITDashboard />} />
                </Route>

                <Route
                  element={
                    <ProtectedRoute roles={['super_admin', 'facilities_admin', 'inventory_admin']} />
                  }
                >
                  <Route path="dashboard/facilities" element={<FacilitiesDashboard />} />
                </Route>

                <Route element={<ProtectedRoute roles={['super_admin', 'hr']} />}>
                  <Route path="dashboard/hr" element={<HRDashboard />} />
                </Route>

                <Route path="assets" element={<AssetsPage />} />
                <Route path="assets/new" element={<AssetNewPage />} />
                <Route path="assets/:id" element={<AssetDetailPage />} />
                <Route path="assets/:id/edit" element={<AssetEditPage />} />

                <Route path="requests" element={<RequestsPage />} />
                <Route path="maintenance" element={<MaintenancePage />} />
                <Route path="profile" element={<ProfilePage />} />

                <Route element={<ProtectedRoute roles={['super_admin']} />}>
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                <Route
                  element={
                    <ProtectedRoute
                      roles={['it_admin', 'facilities_admin', 'inventory_admin', 'super_admin']}
                    />
                  }
                >
                  <Route path="categories" element={<CategoriesPage />} />
                  <Route path="assignments" element={<AssignmentsPage />} />
                  <Route path="locations" element={<LocationsPage />} />
                  <Route path="distributions" element={<DistributionsPage />} />
                </Route>

                <Route
                  element={
                    <ProtectedRoute
                      roles={['hr', 'it_admin', 'facilities_admin', 'inventory_admin', 'super_admin']}
                    />
                  }
                >
                  <Route path="employees" element={<EmployeesPage />} />
                </Route>

                <Route
                  element={
                    <ProtectedRoute
                      roles={['it_admin', 'facilities_admin', 'inventory_admin', 'super_admin', 'hr']}
                    />
                  }
                >
                  <Route path="departments" element={<DepartmentsPage />} />
                </Route>

                <Route
                  element={
                    <ProtectedRoute
                      roles={['it_admin', 'facilities_admin', 'inventory_admin', 'hr', 'super_admin']}
                    />
                  }
                >
                  <Route path="reports" element={<ReportsPage />} />
                </Route>

                <Route element={<ProtectedRoute roles={['super_admin']} />}>
                  <Route path="audit-logs" element={<AuditLogsPage />} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </QueryClientProvider>
  )
}

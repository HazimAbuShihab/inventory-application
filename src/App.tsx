import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'

import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { LoadingState } from '@/components/common/LoadingState'
import { AppShell } from '@/components/layout/AppShell'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/routes/ProtectedRoute'

const Login = lazy(() => import('@/pages/auth/Login'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'))
const AssetDetailPage = lazy(() => import('@/pages/assets/AssetDetailPage'))
const AssetEditPage = lazy(() => import('@/pages/assets/AssetEditPage'))
const AssetNewPage = lazy(() => import('@/pages/assets/AssetNewPage'))
const AssetsPage = lazy(() => import('@/pages/assets/AssetsPage'))
const AssignmentsPage = lazy(() => import('@/pages/AssignmentsPage'))
const AuditLogsPage = lazy(() => import('@/pages/AuditLogsPage'))
const CategoriesPage = lazy(() => import('@/pages/CategoriesPage'))
const DashboardRouter = lazy(() => import('@/pages/dashboard/DashboardRouter'))
const GeneralDashboard = lazy(() => import('@/pages/dashboard/GeneralDashboard'))
const AdminDashboard = lazy(() => import('@/pages/dashboard/AdminDashboard'))
const ITDashboard = lazy(() => import('@/pages/dashboard/ITDashboard'))
const FacilitiesDashboard = lazy(() => import('@/pages/dashboard/FacilitiesDashboard'))
const HRDashboard = lazy(() => import('@/pages/dashboard/HRDashboard'))
const DepartmentsPage = lazy(() => import('@/pages/DepartmentsPage'))
const DistributionsPage = lazy(() => import('@/pages/DistributionsPage'))
const EmployeesPage = lazy(() => import('@/pages/EmployeesPage'))
const LocationsPage = lazy(() => import('@/pages/LocationsPage'))
const MaintenancePage = lazy(() => import('@/pages/MaintenancePage'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage'))
const RequestsPage = lazy(() => import('@/pages/RequestsPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<LoadingState fullPage message="Loading..." />}>
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
                      <Route path="departments" element={<DepartmentsPage />} />
                      <Route path="reports" element={<ReportsPage />} />
                    </Route>

                    <Route element={<ProtectedRoute roles={['super_admin']} />}>
                      <Route path="audit-logs" element={<AuditLogsPage />} />
                    </Route>

                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

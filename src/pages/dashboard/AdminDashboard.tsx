import { Link } from 'react-router-dom'

import { MetricTile, PanelCard } from '@/components/dashboard/DashboardWidgets'
import { LoadingState } from '@/components/common/LoadingState'
import { Badge } from '@/components/ui/badge'
import {
  useDashboardStats,
  useLocationsCount,
  useLowStockAssets,
  useRecentAuditLogs,
} from '@/hooks/useDashboard'
import {
  AuditActivityList,
  DashboardHeader,
  DomainDashboardCard,
} from '@/pages/dashboard/dashboardUtils'

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats()
  const { data: locationsCount = 0, isLoading: locationsLoading } = useLocationsCount()
  const { data: lowStock = [], isLoading: lowStockLoading } = useLowStockAssets(true)
  const { data: auditLogs = [], isLoading: auditLoading } = useRecentAuditLogs(true)

  if (statsLoading || locationsLoading) {
    return <LoadingState message="Loading admin dashboard..." />
  }

  if (statsError || !stats) {
    return (
      <div className="space-y-6">
        <DashboardHeader
          title="Admin Dashboard"
          subtitle="System health and cross-domain overview"
          icon="admin_panel_settings"
          iconTone="bg-slate-50 text-slate-600"
        />
        <p className="text-sm text-destructive">
          Failed to load dashboard: {statsError?.message ?? 'Unknown error'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Admin Dashboard"
        subtitle="System health and cross-domain overview"
        icon="admin_panel_settings"
        iconTone="bg-slate-50 text-slate-600"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Total Assets" value={stats.total_assets} icon="inventory_2" tone="primary" />
        <MetricTile label="Active Employees" value={stats.active_employees} icon="group" tone="blue" />
        <MetricTile label="Locations" value={locationsCount} icon="location_on" tone="indigo" />
        <MetricTile label="Overdue" value={stats.overdue_assignments} icon="warning" tone="red" />
        <MetricTile label="Warranty (30d)" value={stats.warranty_expiring_30} icon="verified_user" tone="yellow" />
        <MetricTile label="Maintenance" value={stats.open_maintenance} icon="build" tone="orange" />
        <MetricTile label="Pending Requests" value={stats.pending_requests} icon="request_quote" tone="purple" />
        <MetricTile label="Low Stock" value={stats.low_stock_count} icon="inventory" tone="red" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DomainDashboardCard
          to="/dashboard/it"
          title="IT Dashboard"
          description="Devices, warranties, and IT asset operations"
          icon="computer"
          accent="bg-primary/10 text-primary"
        />
        <DomainDashboardCard
          to="/dashboard/facilities"
          title="Facilities Dashboard"
          description="Locations, maintenance, and facilities assets"
          icon="domain"
          accent="bg-indigo-50 text-indigo-600"
        />
        <DomainDashboardCard
          to="/dashboard/hr"
          title="HR Dashboard"
          description="Employee coverage, returns, and assignments"
          icon="group"
          accent="bg-purple-50 text-purple-600"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard
          title="Low Stock Alerts"
          action={
            <Link to="/assets" className="text-sm font-medium text-primary hover:underline">
              View assets
            </Link>
          }
        >
          {lowStockLoading ? (
            <p className="text-sm text-slate-500">Loading alerts...</p>
          ) : lowStock.length === 0 ? (
            <p className="text-sm text-slate-500">All disposable stock levels are healthy.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowStock.map((asset) => (
                <li key={asset.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <Link to={`/assets/${asset.id}`} className="font-medium text-slate-900 hover:text-primary">
                      {asset.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {asset.asset_code}
                      {asset.category?.name ? ` · ${asset.category.name}` : ''}
                    </p>
                  </div>
                  <Badge variant="warning">
                    {asset.quantity} / {asset.minimum_stock_level} min
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard
          title="Recent Audit Activity"
          action={
            <Link to="/audit-logs" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          }
        >
          <AuditActivityList logs={auditLogs} loading={auditLoading} />
        </PanelCard>
      </div>
    </div>
  )
}

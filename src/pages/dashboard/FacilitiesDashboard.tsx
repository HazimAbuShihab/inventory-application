import { Link } from 'react-router-dom'

import { MetricTile, PanelCard } from '@/components/dashboard/DashboardWidgets'
import { LoadingState } from '@/components/common/LoadingState'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  useDashboardStats,
  useDomainDashboardStats,
  useDomainMaintenanceRecords,
  useLocationsCount,
} from '@/hooks/useDashboard'
import { formatDate } from '@/lib/utils'
import { DashboardHeader, DashboardLinkButton } from '@/pages/dashboard/dashboardUtils'

export default function FacilitiesDashboard() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats()
  const { data: domainStats, isLoading: domainLoading } = useDomainDashboardStats('facilities', true)
  const { data: locationsCount = 0, isLoading: locationsLoading } = useLocationsCount()
  const { data: maintenanceItems = [], isLoading: maintenanceLoading } = useDomainMaintenanceRecords(
    'facilities',
    true,
  )

  if (statsLoading || domainLoading || locationsLoading) {
    return <LoadingState message="Loading facilities dashboard..." />
  }

  if (statsError || !stats || !domainStats) {
    return (
      <div className="space-y-6">
        <DashboardHeader
          title="Facilities Dashboard"
          subtitle="Locations, maintenance, and facilities assets"
          icon="domain"
          iconTone="bg-indigo-50 text-indigo-600"
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
        title="Facilities Dashboard"
        subtitle="Locations, maintenance, and facilities assets"
        icon="domain"
        iconTone="bg-indigo-50 text-indigo-600"
        actions={
          <>
            <DashboardLinkButton to="/locations" label="Locations" icon="location_on" variant="outline" />
            <DashboardLinkButton to="/maintenance" label="Maintenance" icon="build" />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricTile label="Facilities Assets" value={domainStats.total} icon="domain" tone="indigo" />
        <MetricTile label="Locations" value={locationsCount} icon="location_on" tone="blue" />
        <MetricTile label="Available" value={domainStats.available} icon="check_circle" tone="green" />
        <MetricTile label="Assigned" value={domainStats.assigned} icon="assignment_ind" tone="primary" />
        <MetricTile label="Maintenance" value={domainStats.maintenance} icon="build" tone="yellow" />
        <MetricTile label="Overdue" value={domainStats.overdue} icon="warning" tone="red" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Open Maintenance" value={stats.open_maintenance} icon="handyman" tone="orange" />
        <MetricTile label="Pending Requests" value={stats.pending_requests} icon="request_quote" tone="purple" />
        <MetricTile label="Low Stock" value={stats.low_stock_count} icon="inventory" tone="red" />
        <MetricTile label="Disposable Stock" value={stats.disposable_stock} icon="inventory_2" tone="slate" />
      </div>

      <PanelCard
        title="Maintenance Items"
        action={
          <Link to="/maintenance" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        }
      >
        {maintenanceLoading ? (
          <p className="text-sm text-slate-500">Loading maintenance items...</p>
        ) : maintenanceItems.length === 0 ? (
          <p className="text-sm text-slate-500">No open facilities maintenance records.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {maintenanceItems.map((record) => (
              <li key={record.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{record.asset?.name ?? 'Unknown asset'}</p>
                  <p className="text-xs text-slate-500">
                    {record.asset?.asset_code ?? ''}
                    {record.issue_description ? ` · ${record.issue_description}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={record.status} type="maintenance" />
                  <span className="text-xs text-slate-500">{formatDate(record.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  )
}

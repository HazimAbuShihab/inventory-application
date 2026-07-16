import { Link } from 'react-router-dom'

import { MetricTile, PanelCard } from '@/components/dashboard/DashboardWidgets'
import { LoadingState } from '@/components/common/LoadingState'
import { Badge } from '@/components/ui/badge'
import {
  useDashboardStats,
  useDomainDashboardStats,
  useOverdueAssignments,
  useWarrantyExpiringAssets,
} from '@/hooks/useDashboard'
import { formatDate, labelize } from '@/lib/utils'
import { DashboardHeader, DashboardLinkButton } from '@/pages/dashboard/dashboardUtils'

export default function ITDashboard() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats()
  const { data: domainStats, isLoading: domainLoading } = useDomainDashboardStats('it', true)
  const { data: warrantyExpiring = [], isLoading: warrantyLoading } = useWarrantyExpiringAssets(30, true, 'it')
  const { data: overdueAssignments = [], isLoading: overdueLoading } = useOverdueAssignments(true, undefined, 'it')

  if (statsLoading || domainLoading) {
    return <LoadingState message="Loading IT dashboard..." />
  }

  if (statsError || !stats || !domainStats) {
    return (
      <div className="space-y-6">
        <DashboardHeader
          title="IT Dashboard"
          subtitle="IT assets, warranties, and assignments"
          icon="computer"
          iconTone="bg-primary/10 text-primary"
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
        title="IT Dashboard"
        subtitle="IT assets, warranties, and assignments"
        icon="computer"
        iconTone="bg-primary/10 text-primary"
        actions={
          <>
            <DashboardLinkButton to="/assets/new" label="Add Device" icon="add" variant="outline" />
            <DashboardLinkButton to="/assignments" label="Assign" icon="assignment_ind" />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricTile label="IT Assets" value={domainStats.total} icon="computer" tone="primary" />
        <MetricTile label="Available" value={domainStats.available} icon="check_circle" tone="green" />
        <MetricTile label="Assigned" value={domainStats.assigned} icon="assignment_ind" tone="blue" />
        <MetricTile label="Maintenance" value={domainStats.maintenance} icon="build" tone="yellow" />
        <MetricTile label="Overdue" value={domainStats.overdue} icon="warning" tone="red" />
        <MetricTile label="Warranty (30d)" value={stats.warranty_expiring_30} icon="verified_user" tone="orange" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard
          title="Warranty Expiring (30 Days)"
          action={
            <Link to="/assets" className="text-sm font-medium text-primary hover:underline">
              View assets
            </Link>
          }
        >
          {warrantyLoading ? (
            <p className="text-sm text-slate-500">Loading warranty alerts...</p>
          ) : warrantyExpiring.length === 0 ? (
            <p className="text-sm text-slate-500">No IT warranties expiring in the next 30 days.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {warrantyExpiring.map((asset) => (
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
                  <Badge variant="warning">{formatDate(asset.warranty_expiry)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard
          title="Overdue Assignments"
          action={
            <Link to="/assignments" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          }
        >
          {overdueLoading ? (
            <p className="text-sm text-slate-500">Loading overdue assignments...</p>
          ) : overdueAssignments.length === 0 ? (
            <p className="text-sm text-slate-500">No overdue IT assignments.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {overdueAssignments.map((assignment) => (
                <li key={assignment.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{assignment.asset?.name ?? 'Unknown asset'}</p>
                    <p className="text-xs text-slate-500">
                      {assignment.asset?.asset_code ?? ''}
                      {assignment.employee?.user?.full_name
                        ? ` · ${assignment.employee.user.full_name}`
                        : ''}
                    </p>
                  </div>
                  <Badge variant="destructive">{formatDate(assignment.expected_return_date)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>
      </div>

      <PanelCard title="Quick Links">
        <div className="flex flex-wrap gap-3">
          <Link to="/assets" className="text-sm font-medium text-primary hover:underline">
            Browse IT assets
          </Link>
          <Link to="/categories" className="text-sm font-medium text-primary hover:underline">
            Categories
          </Link>
          <Link to="/reports" className="text-sm font-medium text-primary hover:underline">
            {labelize('utilization')} report
          </Link>
        </div>
      </PanelCard>
    </div>
  )
}

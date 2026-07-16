import { Link } from 'react-router-dom'

import {
  GradientSummaryCard,
  MetricTile,
  PanelCard,
} from '@/components/dashboard/DashboardWidgets'
import { LoadingState } from '@/components/common/LoadingState'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  calcUtilizationRate,
  useDashboardStats,
  useEmployeeRecentActivity,
  useLostAssetsCount,
  useRecentAssignments,
} from '@/hooks/useDashboard'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate, labelize } from '@/lib/utils'
import { DashboardHeader, DashboardLinkButton } from '@/pages/dashboard/dashboardUtils'

export default function GeneralDashboard() {
  const { profile, isInventoryAdmin } = useAuth()
  const employeeId = profile?.employee?.id

  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats()
  const { data: lostCount = 0, isLoading: lostLoading } = useLostAssetsCount()
  const { data: recentAssignments = [], isLoading: assignmentsLoading } = useRecentAssignments(!employeeId)
  const { data: employeeActivity = [], isLoading: activityLoading } = useEmployeeRecentActivity(
    employeeId,
    Boolean(employeeId),
  )

  if (statsLoading || lostLoading) {
    return <LoadingState message="Loading dashboard..." />
  }

  if (statsError || !stats) {
    return (
      <div className="space-y-6">
        <DashboardHeader title="Dashboard" subtitle="Overview of your inventory operations" />
        <p className="text-sm text-destructive">
          Failed to load dashboard: {statsError?.message ?? 'Unknown error'}
        </p>
      </div>
    )
  }

  const utilization = calcUtilizationRate(stats)
  const showEmployeeActivity = Boolean(employeeId)
  const activityLoadingState = showEmployeeActivity ? activityLoading : assignmentsLoading

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Dashboard"
        subtitle="Overview of your inventory operations"
        actions={
          isInventoryAdmin ? (
            <>
              <DashboardLinkButton to="/assignments" label="Assign Asset" icon="assignment_ind" variant="outline" />
              <DashboardLinkButton to="/assets/new" label="Add New Asset" icon="add" />
            </>
          ) : (
            <>
              <DashboardLinkButton to="/requests" label="New Request" icon="request_quote" variant="outline" />
              <DashboardLinkButton to="/assets" label="My Assets" icon="inventory_2" />
            </>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricTile label="Total" value={stats.total_assets} icon="inventory_2" tone="primary" />
        <MetricTile label="Available" value={stats.available_assets} icon="check_circle" tone="green" />
        <MetricTile label="Assigned" value={stats.assigned_assets} icon="assignment_ind" tone="blue" />
        <MetricTile
          label="Maintenance"
          value={stats.open_maintenance}
          icon="build"
          tone="yellow"
        />
        <MetricTile label="Overdue" value={stats.overdue_assignments} icon="warning" tone="red" />
        <MetricTile label="Lost" value={lostCount} icon="search_off" tone="slate" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GradientSummaryCard
          label="Disposable Stock"
          value={stats.disposable_stock}
          icon="inventory"
          from="from-blue-50"
          to="to-white"
          iconTone="bg-blue-100 text-blue-600"
        />
        <GradientSummaryCard
          label="Utilization"
          value={`${utilization.toFixed(1)}%`}
          hint="Assigned permanent assets"
          icon="pie_chart"
          from="from-emerald-50"
          to="to-white"
          iconTone="bg-emerald-100 text-emerald-600"
        />
        <GradientSummaryCard
          label="Active Employees"
          value={stats.active_employees}
          icon="group"
          from="from-violet-50"
          to="to-white"
          iconTone="bg-violet-100 text-violet-600"
        />
        <GradientSummaryCard
          label="Warranty (30d)"
          value={stats.warranty_expiring_30}
          hint="Expiring soon"
          icon="verified_user"
          from="from-amber-50"
          to="to-white"
          iconTone="bg-amber-100 text-amber-600"
        />
      </div>

      <PanelCard
        title="Recent Activity"
        action={
          <Link to="/assignments" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        }
      >
        {activityLoadingState ? (
          <p className="text-sm text-slate-500">Loading activity...</p>
        ) : showEmployeeActivity ? (
          employeeActivity.length === 0 ? (
            <p className="text-sm text-slate-500">No recent assignments or requests.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {employeeActivity.map((item) => (
                <li
                  key={`${item.type}-${item.id}`}
                  className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">
                      {labelize(item.type)}
                      {item.subtitle ? ` · ${item.subtitle}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge
                      status={item.status}
                      type={item.type === 'request' ? 'request' : 'asset'}
                    />
                    <span className="text-xs text-slate-500">{formatDate(item.date)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : recentAssignments.length === 0 ? (
          <p className="text-sm text-slate-500">No recent assignments.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentAssignments.map((assignment) => (
              <li
                key={assignment.id}
                className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{assignment.asset?.name ?? 'Unknown asset'}</p>
                  <p className="text-xs text-slate-500">
                    {assignment.employee?.user?.full_name ?? 'Unknown employee'}
                    {assignment.asset?.asset_code ? ` · ${assignment.asset.asset_code}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={assignment.is_active ? 'active' : 'returned'} />
                  <span className="text-xs text-slate-500">{formatDate(assignment.assigned_date)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  )
}

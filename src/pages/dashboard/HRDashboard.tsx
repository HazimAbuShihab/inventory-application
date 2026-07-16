import { Link } from 'react-router-dom'

import { GradientSummaryCard, MetricTile, PanelCard } from '@/components/dashboard/DashboardWidgets'
import { LoadingState } from '@/components/common/LoadingState'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  useDashboardStats,
  useHrRecentAssignments,
  usePendingReturns,
} from '@/hooks/useDashboard'
import { formatDate } from '@/lib/utils'
import { DashboardHeader, DashboardLinkButton } from '@/pages/dashboard/dashboardUtils'

export default function HRDashboard() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats()
  const { data: hrAssignments = [], isLoading: hrAssignmentsLoading } = useHrRecentAssignments(true)
  const { data: pendingReturns = 0, isLoading: pendingReturnsLoading } = usePendingReturns(true)

  if (statsLoading || pendingReturnsLoading) {
    return <LoadingState message="Loading HR dashboard..." />
  }

  if (statsError || !stats) {
    return (
      <div className="space-y-6">
        <DashboardHeader
          title="HR Dashboard"
          subtitle="Employee coverage and assignment overview"
          icon="group"
          iconTone="bg-purple-50 text-purple-600"
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
        title="HR Dashboard"
        subtitle="Employee coverage and assignment overview"
        icon="group"
        iconTone="bg-purple-50 text-purple-600"
        actions={<DashboardLinkButton to="/employees" label="Employees" icon="group" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Active Employees" value={stats.active_employees} icon="group" tone="purple" />
        <MetricTile
          label="Coverage Rate"
          value={`${stats.coverage_rate.toFixed(1)}%`}
          icon="verified"
          tone="green"
        />
        <MetricTile label="Pending Returns" value={pendingReturns} icon="event_repeat" tone="yellow" />
        <MetricTile label="Pending Requests" value={stats.pending_requests} icon="request_quote" tone="blue" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <GradientSummaryCard
          label="Assigned Assets"
          value={stats.assigned_assets}
          icon="assignment_ind"
          from="from-purple-50"
          to="to-white"
          iconTone="bg-purple-100 text-purple-600"
        />
        <GradientSummaryCard
          label="Overdue Returns"
          value={stats.overdue_assignments}
          hint="Past expected return date"
          icon="warning"
          from="from-red-50"
          to="to-white"
          iconTone="bg-red-100 text-red-600"
        />
        <GradientSummaryCard
          label="Open Maintenance"
          value={stats.open_maintenance}
          icon="build"
          from="from-amber-50"
          to="to-white"
          iconTone="bg-amber-100 text-amber-600"
        />
      </div>

      <PanelCard
        title="Recent Assignments"
        action={
          <Link to="/assignments" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        }
      >
        {hrAssignmentsLoading ? (
          <p className="text-sm text-slate-500">Loading assignments...</p>
        ) : hrAssignments.length === 0 ? (
          <p className="text-sm text-slate-500">No recent assignments.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {hrAssignments.map((assignment) => (
              <li key={assignment.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
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

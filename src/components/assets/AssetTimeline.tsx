import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { MaterialIcon } from '@/components/common/MaterialIcon'
import { supabase } from '@/lib/supabase'
import { cn, formatDate, labelize } from '@/lib/utils'

export type TimelineEvent = {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  userName?: string | null
  status: 'completed' | 'in_progress' | 'pending' | 'warning' | 'error'
}

const statusDot: Record<TimelineEvent['status'], string> = {
  completed: 'bg-slate-400',
  in_progress: 'bg-primary',
  pending: 'bg-amber-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
}

function formatTimelineDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffH = (now.getTime() - d.getTime()) / 36e5
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffH < 24) return `Today, ${time}`
  if (diffH < 48) return `Yesterday, ${time}`
  return formatDate(iso)
}

export function useAssetTimeline(assetId: string | undefined) {
  return useQuery({
    queryKey: ['asset-timeline', assetId],
    enabled: Boolean(assetId),
    queryFn: async () => {
      if (!assetId) return [] as TimelineEvent[]

      const [{ data: audits }, { data: assignments }, { data: maintenance }, { data: transactions }] =
        await Promise.all([
          supabase
            .from('audit_logs')
            .select('id, action, entity, created_at, user:users(full_name)')
            .eq('entity_id', assetId)
            .order('created_at', { ascending: false })
            .limit(30),
          supabase
            .from('asset_assignments')
            .select(
              'id, assigned_date, returned_date, notes, is_active, employee:employees(employee_number, user:users(full_name)), location:locations(building, floor, room)',
            )
            .eq('asset_id', assetId)
            .order('assigned_date', { ascending: false }),
          supabase
            .from('maintenance_records')
            .select('id, issue_description, status, created_at, maintenance_date')
            .eq('asset_id', assetId)
            .order('created_at', { ascending: false }),
          supabase
            .from('asset_transactions')
            .select('id, transaction_type, quantity, notes, created_at')
            .eq('asset_id', assetId)
            .order('created_at', { ascending: false })
            .limit(20),
        ])

      const events: TimelineEvent[] = []

      for (const a of assignments ?? []) {
        const emp = a.employee as {
          employee_number?: string
          user?: { full_name?: string } | null
        } | null
        const empName = emp?.user?.full_name ?? emp?.employee_number ?? 'Employee'
        const loc = a.location as { building?: string; floor?: number; room?: string | null } | null
        const locLabel = loc
          ? [loc.building, loc.floor != null ? `Floor ${loc.floor}` : null, loc.room]
              .filter(Boolean)
              .join(', ')
          : null

        events.push({
          id: `assign-${a.id}`,
          type: 'assigned',
          title: 'Asset Assigned',
          description: `Assigned to ${empName}${locLabel ? ` at ${locLabel}` : ''}${a.notes ? ` — ${a.notes}` : ''}`,
          timestamp: a.assigned_date,
          userName: empName,
          status: a.is_active ? 'in_progress' : 'completed',
        })

        if (a.returned_date) {
          events.push({
            id: `return-${a.id}`,
            type: 'returned',
            title: 'Asset Returned',
            description: `Returned by ${empName}`,
            timestamp: a.returned_date,
            userName: empName,
            status: 'completed',
          })
        }
      }

      for (const m of maintenance ?? []) {
        events.push({
          id: `maint-${m.id}`,
          type: 'maintenance',
          title: 'Maintenance',
          description: m.issue_description,
          timestamp: m.maintenance_date ?? m.created_at,
          status:
            m.status === 'completed' ? 'completed' : m.status === 'cancelled' ? 'error' : 'warning',
        })
      }

      for (const t of transactions ?? []) {
        events.push({
          id: `tx-${t.id}`,
          type: t.transaction_type,
          title: labelize(t.transaction_type),
          description: t.notes ?? `Quantity: ${t.quantity}`,
          timestamp: t.created_at,
          status: 'completed',
        })
      }

      for (const log of audits ?? []) {
        const user = log.user as { full_name?: string } | null
        events.push({
          id: `audit-${log.id}`,
          type: log.action.toLowerCase(),
          title: labelize(log.action),
          description: `${log.entity} record ${log.action.toLowerCase()}`,
          timestamp: log.created_at,
          userName: user?.full_name,
          status: log.action === 'DELETE' ? 'error' : 'completed',
        })
      }

      return events.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
    },
  })
}

const typeIcon: Record<string, string> = {
  assigned: 'person_add',
  returned: 'person_remove',
  maintenance: 'build',
  stock_in: 'add_circle',
  stock_out: 'remove_circle',
  created: 'add_circle',
  updated: 'edit',
  deleted: 'delete',
  insert: 'add_circle',
  update: 'edit',
  delete: 'delete',
}

export function AssetTimeline({ assetId, className }: { assetId: string; className?: string }) {
  const { data: events = [], isLoading } = useAssetTimeline(assetId)
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? events : events.slice(0, 4)

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white shadow-card', className)}>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6">
        <h3 className="text-lg font-bold text-slate-900">Activity Timeline</h3>
        {events.length > 4 ? (
          <button
            type="button"
            className="text-sm font-medium text-primary hover:underline"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Show Less' : 'View All'}
          </button>
        ) : null}
      </div>

      <div className="p-4 sm:p-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <MaterialIcon name="progress_activity" className="animate-spin text-[32px] text-primary" />
          </div>
        ) : events.length === 0 ? (
          <div className="py-10 text-center">
            <MaterialIcon name="timeline" className="text-[48px] text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No activity recorded</p>
            <p className="mt-1 text-xs text-slate-400">Timeline will appear as actions are taken</p>
          </div>
        ) : (
          <div className="relative space-y-8 border-l-2 border-slate-200 pl-4">
            {visible.map((event) => (
              <div key={event.id} className="relative">
                <span
                  className={cn(
                    'absolute -left-[21px] top-1 size-3 rounded-full border-2 border-white ring-4 ring-white',
                    statusDot[event.status],
                  )}
                />
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {formatTimelineDate(event.timestamp)}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <MaterialIcon
                    name={typeIcon[event.type] ?? 'info'}
                    className="text-[16px] text-slate-400"
                  />
                  <p className="text-sm font-bold text-slate-900">{event.title}</p>
                </div>
                <p className="text-sm text-slate-500">{event.description}</p>
                {event.userName ? (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
                      {event.userName
                        .split(' ')
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500">{event.userName}</span>
                  </div>
                ) : null}
              </div>
            ))}
            {!expanded && events.length > 4 ? (
              <div className="border-t border-slate-100 pt-4 text-center">
                <p className="text-sm text-slate-500">{events.length - 4} more activities</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

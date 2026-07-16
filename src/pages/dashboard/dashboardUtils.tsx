import { Link } from 'react-router-dom'

import { MaterialIcon } from '@/components/common/MaterialIcon'
import { Button } from '@/components/ui/button'
import { cn, formatDate, labelize } from '@/lib/utils'
import type { AuditLogWithUser } from '@/hooks/useDashboard'

type DashboardHeaderProps = {
  title: string
  subtitle: string
  icon?: string
  iconTone?: string
  actions?: React.ReactNode
}

export function DashboardHeader({ title, subtitle, icon, iconTone, actions }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        {icon ? (
          <div className={cn('rounded-xl p-2.5', iconTone ?? 'bg-slate-50 text-slate-600')}>
            <MaterialIcon name={icon} className="text-[28px]" />
          </div>
        ) : null}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="text-slate-500">{subtitle}</p>
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function DashboardLinkButton({
  to,
  label,
  icon,
  variant = 'default',
}: {
  to: string
  label: string
  icon: string
  variant?: 'default' | 'outline'
}) {
  return (
    <Button variant={variant} asChild>
      <Link to={to}>
        <MaterialIcon name={icon} className="text-[18px]" />
        {label}
      </Link>
    </Button>
  )
}

export function getAuditActionIcon(action: string): { icon: string; tone: string } {
  const normalized = action.toLowerCase()
  if (normalized.includes('create') || normalized.includes('insert')) {
    return { icon: 'add_circle', tone: 'bg-green-50 text-green-600' }
  }
  if (normalized.includes('update') || normalized.includes('edit')) {
    return { icon: 'edit', tone: 'bg-blue-50 text-blue-600' }
  }
  if (normalized.includes('delete') || normalized.includes('remove')) {
    return { icon: 'delete', tone: 'bg-red-50 text-red-600' }
  }
  if (normalized.includes('assign')) {
    return { icon: 'assignment_ind', tone: 'bg-primary/10 text-primary' }
  }
  if (normalized.includes('return')) {
    return { icon: 'undo', tone: 'bg-yellow-50 text-yellow-600' }
  }
  if (normalized.includes('login') || normalized.includes('auth')) {
    return { icon: 'login', tone: 'bg-slate-50 text-slate-600' }
  }
  return { icon: 'history', tone: 'bg-slate-50 text-slate-600' }
}

export function AuditActivityList({ logs, loading }: { logs: AuditLogWithUser[]; loading: boolean }) {
  if (loading) {
    return <p className="text-sm text-slate-500">Loading activity...</p>
  }

  if (logs.length === 0) {
    return <p className="text-sm text-slate-500">No recent activity recorded.</p>
  }

  return (
    <ul className="divide-y divide-slate-100">
      {logs.map((log) => {
        const { icon, tone } = getAuditActionIcon(log.action)
        return (
          <li key={log.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <div className={cn('rounded-lg p-2', tone)}>
              <MaterialIcon name={icon} className="text-[20px]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900">
                {labelize(log.action)} · {labelize(log.entity)}
              </p>
              <p className="text-xs text-slate-500">
                {log.user?.full_name ?? 'System'}
                {log.user?.email ? ` (${log.user.email})` : ''}
              </p>
            </div>
            <span className="shrink-0 text-xs text-slate-500">{formatDate(log.created_at)}</span>
          </li>
        )
      })}
    </ul>
  )
}

export function DomainDashboardCard({
  to,
  title,
  description,
  icon,
  accent,
}: {
  to: string
  title: string
  description: string
  icon: string
  accent: string
}) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-slate-200 bg-white p-5 shadow-card transition hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-slate-900 group-hover:text-primary">{title}</p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <div className={cn('rounded-full p-3', accent)}>
          <MaterialIcon name={icon} className="text-[24px]" />
        </div>
      </div>
    </Link>
  )
}

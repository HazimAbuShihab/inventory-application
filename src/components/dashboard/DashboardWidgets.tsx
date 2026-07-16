import { MaterialIcon } from '@/components/common/MaterialIcon'
import { cn } from '@/lib/utils'

type MetricTileProps = {
  label: string
  value: string | number
  icon: string
  tone?: 'primary' | 'green' | 'blue' | 'yellow' | 'red' | 'slate' | 'purple' | 'orange' | 'indigo'
  className?: string
}

const toneMap = {
  primary: 'bg-primary/10 text-primary',
  green: 'bg-green-50 text-green-600',
  blue: 'bg-blue-50 text-blue-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  red: 'bg-red-50 text-red-600',
  slate: 'bg-slate-50 text-slate-600',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-600',
  indigo: 'bg-indigo-50 text-indigo-600',
} as const

export function MetricTile({ label, value, icon, tone = 'primary', className }: MetricTileProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-4 shadow-card',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('rounded-lg p-2', toneMap[tone])}>
          <MaterialIcon name={icon} className="text-[20px]" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-xl font-bold tabular-nums text-slate-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
      </div>
    </div>
  )
}

type GradientCardProps = {
  label: string
  value: string | number
  hint?: string
  icon: string
  from: string
  to?: string
  iconTone?: string
  className?: string
}

export function GradientSummaryCard({
  label,
  value,
  hint,
  icon,
  from,
  to,
  iconTone,
  className,
}: GradientCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-gradient-to-br p-6 shadow-card',
        from,
        to,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        <div className={cn('rounded-full p-3', iconTone ?? 'bg-primary/20 text-primary')}>
          <MaterialIcon name={icon} className="text-[24px]" />
        </div>
      </div>
    </div>
  )
}

type PanelCardProps = {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function PanelCard({ title, action, children, className }: PanelCardProps) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white shadow-card', className)}>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        {action}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  )
}

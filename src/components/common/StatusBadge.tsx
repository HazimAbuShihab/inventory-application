import { MaterialIcon } from '@/components/common/MaterialIcon'
import { cn, labelize } from '@/lib/utils'
import type { AssetStatus, MaintenanceStatus, RequestStatus } from '@/types/database'

type StatusType = 'asset' | 'request' | 'maintenance' | 'condition'

interface StatusBadgeProps {
  status: AssetStatus | RequestStatus | MaintenanceStatus | string
  type?: StatusType
  className?: string
}

const assetStyle: Record<string, { icon: string; className: string }> = {
  available: { icon: 'check_circle', className: 'bg-green-100 text-green-800' },
  assigned: { icon: 'person', className: 'bg-blue-100 text-blue-800' },
  under_maintenance: { icon: 'build', className: 'bg-yellow-100 text-yellow-800' },
  retired: { icon: 'archive', className: 'bg-gray-100 text-gray-800' },
  lost: { icon: 'error', className: 'bg-red-100 text-red-800' },
  damaged: { icon: 'report', className: 'bg-red-100 text-red-800' },
}

const conditionStyle: Record<string, { icon: string; className: string }> = {
  new: { icon: 'star', className: 'bg-emerald-100 text-emerald-800' },
  very_good: { icon: 'thumb_up', className: 'bg-green-100 text-green-800' },
  good: { icon: 'sentiment_satisfied', className: 'bg-blue-100 text-blue-800' },
  low: { icon: 'sentiment_neutral', className: 'bg-yellow-100 text-yellow-800' },
  bad: { icon: 'sentiment_dissatisfied', className: 'bg-orange-100 text-orange-800' },
  very_bad: { icon: 'dangerous', className: 'bg-red-100 text-red-800' },
}

const requestStyle: Record<string, { icon: string; className: string }> = {
  pending: { icon: 'pending', className: 'bg-yellow-100 text-yellow-800' },
  approved: { icon: 'check_circle', className: 'bg-green-100 text-green-800' },
  rejected: { icon: 'cancel', className: 'bg-red-100 text-red-800' },
  fulfilled: { icon: 'task_alt', className: 'bg-blue-100 text-blue-800' },
  cancelled: { icon: 'block', className: 'bg-gray-100 text-gray-800' },
}

const maintenanceStyle: Record<string, { icon: string; className: string }> = {
  open: { icon: 'report', className: 'bg-yellow-100 text-yellow-800' },
  in_progress: { icon: 'build', className: 'bg-blue-100 text-blue-800' },
  completed: { icon: 'check_circle', className: 'bg-green-100 text-green-800' },
  cancelled: { icon: 'cancel', className: 'bg-gray-100 text-gray-800' },
}

function resolve(status: string, type: StatusType) {
  const key = status.toLowerCase()
  if (type === 'condition') return conditionStyle[key]
  if (type === 'request') return requestStyle[key]
  if (type === 'maintenance') return maintenanceStyle[key]
  return assetStyle[key]
}

export function StatusBadge({ status, type = 'asset', className }: StatusBadgeProps) {
  const style = resolve(status, type) ?? {
    icon: 'label',
    className: 'bg-slate-100 text-slate-700',
  }

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
        style.className,
        className,
      )}
    >
      <MaterialIcon name={style.icon} className="text-[14px]" />
      {labelize(status)}
    </span>
  )
}

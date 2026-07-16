import { MaterialIcon } from '@/components/common/MaterialIcon'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  message?: string
  className?: string
  fullPage?: boolean
}

export function LoadingState({ message = 'Loading...', className, fullPage = false }: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-slate-500',
        fullPage ? 'min-h-[50vh]' : 'py-12',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <MaterialIcon name="progress_activity" className="animate-spin text-[32px] text-primary" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

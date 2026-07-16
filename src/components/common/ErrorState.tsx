import { MaterialIcon } from '@/components/common/MaterialIcon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50/50 px-6 py-12 text-center',
        className,
      )}
      role="alert"
    >
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600">
        <MaterialIcon name="error" className="text-[28px]" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-600">{message}</p>
      {onRetry ? (
        <Button type="button" variant="outline" className="mt-5" onClick={onRetry}>
          <MaterialIcon name="refresh" className="text-[18px]" />
          Try again
        </Button>
      ) : null}
    </div>
  )
}

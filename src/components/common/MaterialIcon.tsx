import { cn } from '@/lib/utils'

type MaterialIconProps = {
  name: string
  className?: string
  filled?: boolean
}

/** Material Symbols Outlined — matches legacy Angular inventory UI */
export function MaterialIcon({ name, className, filled = false }: MaterialIconProps) {
  return (
    <span
      className={cn('material-symbols-outlined', className)}
      style={filled ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
      aria-hidden
    >
      {name}
    </span>
  )
}

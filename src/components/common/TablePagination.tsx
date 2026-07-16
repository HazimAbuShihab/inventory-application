import { Button } from '@/components/ui/button'
import { MaterialIcon } from '@/components/common/MaterialIcon'

interface TablePaginationProps {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
}

export function TablePagination({ page, pageSize, totalCount, onPageChange }: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  if (totalCount <= pageSize) return null

  const from = page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, totalCount)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-2">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from}–{to}</span> of{' '}
        <span className="font-medium text-foreground">{totalCount}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <MaterialIcon name="chevron_left" className="text-[18px]" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page + 1} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          Next
          <MaterialIcon name="chevron_right" className="text-[18px]" />
        </Button>
      </div>
    </div>
  )
}

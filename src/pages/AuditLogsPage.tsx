import { ChevronDown, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuditLogFilterOptions, useAuditLogs, type AuditLogWithUser } from '@/hooks/useAuditLogs'
import { formatDate, labelize } from '@/lib/utils'
import type { Json } from '@/types/database'

type AuditLogFilters = {
  action: string
  entity: string
  dateFrom: string
  dateTo: string
}

function JsonPreview({ value, label }: { value: Json | null; label: string }) {
  if (value == null) {
    return (
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">—</p>
      </div>
    )
  }

  const formatted = JSON.stringify(value, null, 2)
  const truncated = formatted.length > 120

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
        {truncated ? `${formatted.slice(0, 120)}…` : formatted}
      </pre>
    </div>
  )
}

function AuditLogDetails({ log }: { log: AuditLogWithUser }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="space-y-3">
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-0 text-muted-foreground hover:text-foreground"
        onClick={() => setExpanded((prev) => !prev)}
      >
        {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        {expanded ? 'Hide values' : 'Show values'}
      </Button>
      {expanded ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <JsonPreview value={log.old_values} label="Old Values" />
          <JsonPreview value={log.new_values} label="New Values" />
        </div>
      ) : null}
    </div>
  )
}

export default function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditLogFilters>({
    action: 'all',
    entity: 'all',
    dateFrom: '',
    dateTo: '',
  })

  const queryFilters = useMemo(
    () => ({
      action: filters.action,
      entity: filters.entity,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    }),
    [filters],
  )

  const { data: logs = [], isLoading, error } = useAuditLogs(queryFilters)
  const { data: filterOptions } = useAuditLogFilterOptions()

  const columns: DataTableColumn<AuditLogWithUser>[] = useMemo(
    () => [
      {
        key: 'created_at',
        header: 'Date',
        cell: (row) => <span className="whitespace-nowrap">{formatDate(row.created_at)}</span>,
      },
      {
        key: 'user',
        header: 'User',
        cell: (row) => (
          <div>
            <p className="font-medium">{row.user?.full_name ?? 'System'}</p>
            <p className="text-xs text-muted-foreground">{row.user?.email ?? ''}</p>
          </div>
        ),
      },
      {
        key: 'action',
        header: 'Action',
        cell: (row) => <Badge variant="outline">{labelize(row.action)}</Badge>,
      },
      {
        key: 'entity',
        header: 'Entity',
        cell: (row) => labelize(row.entity),
      },
      {
        key: 'entity_id',
        header: 'Entity ID',
        cell: (row) => (
          <span className="font-mono text-xs text-muted-foreground">{row.entity_id?.slice(0, 8) ?? '—'}…</span>
        ),
      },
      {
        key: 'values',
        header: 'Changes',
        cell: (row) => <AuditLogDetails log={row} />,
      },
    ],
    [],
  )

  if (isLoading) return <LoadingState message="Loading audit logs..." />

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Audit Logs" description="Review system activity and changes" />
        <p className="text-sm text-destructive">Failed to load audit logs: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="Review system activity and changes" />

      <div className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Action</Label>
          <Select
            value={filters.action}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, action: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {(filterOptions?.actions ?? []).map((action) => (
                <SelectItem key={action} value={action}>
                  {labelize(action)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Entity</Label>
          <Select
            value={filters.entity}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, entity: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {(filterOptions?.entities ?? []).map((entity) => (
                <SelectItem key={entity} value={entity}>
                  {labelize(entity)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date-from">From</Label>
          <Input
            id="date-from"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date-to">To</Label>
          <Input
            id="date-to"
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        keyExtractor={(row) => row.id}
        emptyTitle="No audit logs found"
        emptyDescription="System activity will be recorded here as changes are made."
      />
    </div>
  )
}

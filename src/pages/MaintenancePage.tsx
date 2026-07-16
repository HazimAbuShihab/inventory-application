import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import { useAssets } from '@/hooks/useAssets'
import {
  useCreateMaintenance,
  useDeleteMaintenance,
  useEmployeeAssignedAssets,
  useMaintenanceRecords,
  useUpdateMaintenance,
  type MaintenanceWithRelations,
} from '@/hooks/useMaintenance'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { MaintenanceStatus } from '@/types/database'

type MaintenanceFormState = {
  asset_id: string
  issue_description: string
  status: MaintenanceStatus
  maintenance_date: string
  cost: string
  notes: string
}

const MAINTENANCE_STATUSES: MaintenanceStatus[] = ['open', 'in_progress', 'completed', 'cancelled']

const emptyForm = (): MaintenanceFormState => ({
  asset_id: '',
  issue_description: '',
  status: 'open',
  maintenance_date: '',
  cost: '',
  notes: '',
})

export default function MaintenancePage() {
  const { isAdmin, profile } = useAuth()
  const employeeId = profile?.employee?.id

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MaintenanceWithRelations | null>(null)
  const [form, setForm] = useState<MaintenanceFormState>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceWithRelations | null>(null)

  const { data: records = [], isLoading, error } = useMaintenanceRecords(
    isAdmin ? undefined : profile?.id,
  )
  const { data: allAssets = [] } = useAssets()
  const { data: assignedAssets = [] } = useEmployeeAssignedAssets(employeeId)
  const createMutation = useCreateMaintenance()
  const updateMutation = useUpdateMaintenance()
  const deleteMutation = useDeleteMaintenance()

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  function openEdit(record: MaintenanceWithRelations) {
    setEditing(record)
    setForm({
      asset_id: record.asset_id,
      issue_description: record.issue_description,
      status: record.status as MaintenanceStatus,
      maintenance_date: record.maintenance_date ?? '',
      cost: record.cost != null ? String(record.cost) : '',
      notes: record.notes ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.issue_description.trim()) {
      toast.error('Issue description is required')
      return
    }

    if (!editing && !form.asset_id) {
      toast.error('Please select an asset')
      return
    }

    const cost = form.cost.trim() ? parseFloat(form.cost) : null
    if (form.cost.trim() && (cost == null || Number.isNaN(cost) || cost < 0)) {
      toast.error('Enter a valid cost')
      return
    }

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          assetId: editing.asset_id,
          previousStatus: editing.status as MaintenanceStatus,
          issue_description: form.issue_description.trim(),
          status: form.status,
          maintenance_date: form.maintenance_date || null,
          cost,
          notes: form.notes.trim() || null,
        })
        toast.success('Maintenance record updated')
      } else {
        await createMutation.mutateAsync({
          asset_id: form.asset_id,
          issue_description: form.issue_description.trim(),
          status: isAdmin ? form.status : 'open',
          maintenance_date: isAdmin && form.maintenance_date ? form.maintenance_date : null,
          cost: isAdmin ? cost : null,
          reported_by: profile?.id ?? null,
          notes: form.notes.trim() || null,
        })
        toast.success(isAdmin ? 'Maintenance record created' : 'Maintenance report submitted')
      }
      setDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save maintenance record')
    }
  }

  async function handleDelete() {
    if (!deleteTarget?.asset?.id) return

    try {
      await deleteMutation.mutateAsync({
        id: deleteTarget.id,
        assetId: deleteTarget.asset.id,
      })
      toast.success('Maintenance record deleted')
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete record')
    }
  }

  const columns: DataTableColumn<MaintenanceWithRelations>[] = [
    {
      key: 'asset',
      header: 'Asset',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.asset?.name ?? '—'}</p>
          <p className="font-mono text-xs text-muted-foreground">{row.asset?.asset_code ?? ''}</p>
        </div>
      ),
    },
    {
      key: 'issue',
      header: 'Issue',
      cell: (row) => <span className="max-w-xs truncate text-sm">{row.issue_description}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} type="maintenance" />,
    },
    {
      key: 'maintenance_date',
      header: 'Service Date',
      cell: (row) => formatDate(row.maintenance_date),
    },
    {
      key: 'cost',
      header: 'Cost',
      cell: (row) => formatCurrency(row.cost),
    },
    {
      key: 'reported_by',
      header: 'Reported By',
      cell: (row) => row.reported_by_user?.full_name ?? '—',
    },
    {
      key: 'created_at',
      header: 'Reported',
      cell: (row) => formatDate(row.created_at),
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: '',
            headerClassName: 'w-[100px]',
            cell: (row: MaintenanceWithRelations) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(row)}
                  aria-label="Edit maintenance record"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteTarget(row)}
                  aria-label="Delete maintenance record"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ),
          } satisfies DataTableColumn<MaintenanceWithRelations>,
        ]
      : []),
  ]

  if (isLoading) return <LoadingState message="Loading maintenance records..." />
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Maintenance"
          description={
            isAdmin ? 'Manage asset maintenance records' : 'Report issues with your assigned assets'
          }
        />
        <p className="text-sm text-destructive">Failed to load maintenance records: {error.message}</p>
      </div>
    )
  }

  const canCreate = isAdmin || assignedAssets.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description={
          isAdmin ? 'Manage asset maintenance records' : 'Report issues with your assigned assets'
        }
        actions={
          canCreate ? (
            <Button onClick={openCreate} disabled={!isAdmin && assignedAssets.length === 0}>
              <Plus className="size-4" />
              {isAdmin ? 'New Record' : 'Report Issue'}
            </Button>
          ) : undefined
        }
      />

      <DataTable
        columns={columns}
        data={records}
        keyExtractor={(row) => row.id}
        emptyTitle="No maintenance records"
        emptyDescription={
          isAdmin
            ? 'Maintenance records will appear here as issues are reported.'
            : 'Report an issue with one of your assigned assets.'
        }
        emptyAction={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              {isAdmin ? 'New Record' : 'Report Issue'}
            </Button>
          ) : undefined
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit Maintenance Record' : isAdmin ? 'New Maintenance Record' : 'Report Issue'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update maintenance status, cost, and service details.'
                : isAdmin
                  ? 'Create a maintenance record for an asset.'
                  : 'Report a maintenance issue for one of your assigned assets.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {editing ? (
              <div className="space-y-2">
                <Label>Asset</Label>
                <Input
                  value={`${editing.asset?.name ?? ''} (${editing.asset?.asset_code ?? ''})`}
                  disabled
                />
              </div>
            ) : isAdmin ? (
              <div className="space-y-2">
                <Label>Asset *</Label>
                <Select
                  value={form.asset_id || 'none'}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, asset_id: value === 'none' ? '' : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>
                      Select an asset
                    </SelectItem>
                    {allAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name} ({asset.asset_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Asset *</Label>
                <Select
                  value={form.asset_id || 'none'}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, asset_id: value === 'none' ? '' : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assigned asset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>
                      Select an asset
                    </SelectItem>
                    {assignedAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name} ({asset.asset_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="issue">Issue Description *</Label>
              <Textarea
                id="issue"
                value={form.issue_description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, issue_description: e.target.value }))
                }
                placeholder="Describe the maintenance issue"
              />
            </div>

            {isAdmin ? (
              <>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, status: value as MaintenanceStatus }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MAINTENANCE_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-date">Service Date</Label>
                    <Input
                      id="maintenance-date"
                      type="date"
                      value={form.maintenance_date}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, maintenance_date: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cost">Cost</Label>
                    <Input
                      id="cost"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.cost}
                      onChange={(e) => setForm((prev) => ({ ...prev, cost: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editing ? 'Save Changes' : 'Submit Report'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Maintenance Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the maintenance record for &quot;
              {deleteTarget?.asset?.name}&quot;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

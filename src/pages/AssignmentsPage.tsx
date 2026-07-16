import { Plus, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Badge } from '@/components/ui/badge'
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
import {
  useActiveEmployeesForAssignment,
  useActiveLocationsForAssignment,
  useAssignments,
  useAvailablePermanentAssets,
  useCreateAssignment,
  useReturnAssignment,
  type AssignmentFilter,
  type AssignmentLocation,
  type AssignmentWithRelations,
} from '@/hooks/useAssignments'
import { formatDate } from '@/lib/utils'

type AssignFormState = {
  asset_id: string
  employee_id: string
  assigned_date: string
  location_id: string
  expected_return_date: string
  condition_before: string
  notes: string
}

type ReturnFormState = {
  returned_date: string
  condition_after: string
  notes: string
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function formatLocationName(location: AssignmentLocation | null | undefined) {
  if (!location) return '—'
  const parts = [
    location.building,
    `Floor ${location.floor}`,
    location.room,
  ].filter(Boolean)
  return parts.join(', ')
}

function isAssignmentOverdue(assignment: AssignmentWithRelations) {
  return (
    assignment.is_active &&
    assignment.expected_return_date != null &&
    assignment.expected_return_date < todayIso()
  )
}

const emptyAssignForm = (): AssignFormState => ({
  asset_id: '',
  employee_id: '',
  assigned_date: todayIso(),
  location_id: '',
  expected_return_date: '',
  condition_before: '',
  notes: '',
})

const emptyReturnForm = (): ReturnFormState => ({
  returned_date: todayIso(),
  condition_after: '',
  notes: '',
})

export default function AssignmentsPage() {
  const { profile } = useAuth()
  const [filter, setFilter] = useState<AssignmentFilter>('active')
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [returnTarget, setReturnTarget] = useState<AssignmentWithRelations | null>(null)
  const [assignForm, setAssignForm] = useState<AssignFormState>(emptyAssignForm)
  const [returnForm, setReturnForm] = useState<ReturnFormState>(emptyReturnForm)

  const { data: assignments = [], isLoading, error } = useAssignments(filter)
  const { data: availableAssets = [] } = useAvailablePermanentAssets()
  const { data: activeEmployees = [] } = useActiveEmployeesForAssignment()
  const { data: activeLocations = [] } = useActiveLocationsForAssignment()
  const createMutation = useCreateAssignment()
  const returnMutation = useReturnAssignment()

  function openAssign() {
    setAssignForm(emptyAssignForm())
    setAssignDialogOpen(true)
  }

  function openReturn(assignment: AssignmentWithRelations) {
    setReturnTarget(assignment)
    setReturnForm(emptyReturnForm())
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()

    if (!assignForm.asset_id) {
      toast.error('Please select an asset')
      return
    }
    if (!assignForm.employee_id) {
      toast.error('Please select an employee')
      return
    }
    if (!profile?.id) {
      toast.error('User profile not loaded')
      return
    }

    try {
      await createMutation.mutateAsync({
        asset_id: assignForm.asset_id,
        employee_id: assignForm.employee_id,
        assigned_date: assignForm.assigned_date,
        assigned_by: profile.id,
        location_id: assignForm.location_id || null,
        expected_return_date: assignForm.expected_return_date || null,
        condition_before: assignForm.condition_before.trim() || null,
        notes: assignForm.notes.trim() || null,
      })
      toast.success('Asset assigned successfully')
      setAssignDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign asset')
    }
  }

  async function handleReturn(e: React.FormEvent) {
    e.preventDefault()
    if (!returnTarget?.asset?.id) return

    try {
      await returnMutation.mutateAsync({
        id: returnTarget.id,
        assetId: returnTarget.asset.id,
        returned_date: returnForm.returned_date,
        condition_after: returnForm.condition_after.trim() || null,
        notes: returnForm.notes.trim() || null,
      })
      toast.success('Asset returned successfully')
      setReturnTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to return asset')
    }
  }

  const columns: DataTableColumn<AssignmentWithRelations>[] = [
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
      key: 'employee',
      header: 'Employee',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.employee?.user?.full_name ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{row.employee?.employee_number ?? ''}</p>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      cell: (row) => (
        <span className="text-sm">{formatLocationName(row.location)}</span>
      ),
    },
    {
      key: 'asset_status',
      header: 'Asset Status',
      cell: (row) =>
        row.asset?.status ? <StatusBadge status={row.asset.status} type="asset" /> : '—',
    },
    {
      key: 'assigned_date',
      header: 'Assigned',
      cell: (row) => (
        <div className="space-y-1">
          <p>{formatDate(row.assigned_date)}</p>
          {isAssignmentOverdue(row) ? (
            <Badge variant="destructive">Overdue</Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'expected_return_date',
      header: 'Expected Return',
      cell: (row) => formatDate(row.expected_return_date),
    },
    {
      key: 'returned_date',
      header: 'Returned',
      cell: (row) => formatDate(row.returned_date),
    },
    {
      key: 'assigned_by',
      header: 'Assigned By',
      cell: (row) => row.assigned_by_user?.full_name ?? '—',
    },
    {
      key: 'condition',
      header: 'Condition',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.returned_date
            ? row.condition_after ?? '—'
            : row.condition_before ?? '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-[100px]',
      cell: (row) =>
        row.is_active ? (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => openReturn(row)}>
              <Undo2 className="size-4" />
              Return
            </Button>
          </div>
        ) : null,
    },
  ]

  if (isLoading) return <LoadingState message="Loading assignments..." />
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Assignments" description="Track asset assignments to employees" />
        <p className="text-sm text-destructive">Failed to load assignments: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments"
        description="Track asset assignments to employees"
        actions={
          <div className="flex flex-col items-end gap-1">
            <Button onClick={openAssign} disabled={availableAssets.length === 0}>
              <Plus className="size-4" />
              Assign Asset
            </Button>
            {availableAssets.length === 0 ? (
              <p className="max-w-xs text-right text-xs text-slate-500">
                No available permanent assets. Mark an asset as available first.
              </p>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={filter} onValueChange={(value) => setFilter(value as AssignmentFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={assignments}
        keyExtractor={(row) => row.id}
        emptyTitle={
          filter === 'active'
            ? 'No active assignments'
            : filter === 'overdue'
              ? 'No overdue assignments'
              : 'No assignments found'
        }
        emptyDescription={
          filter === 'active'
            ? 'Assign available permanent assets to employees.'
            : filter === 'overdue'
              ? 'Assignments past their expected return date will appear here.'
              : 'Assignment records will appear here.'
        }
        emptyAction={
          filter === 'active' && availableAssets.length > 0 ? (
            <Button onClick={openAssign}>
              <Plus className="size-4" />
              Assign Asset
            </Button>
          ) : undefined
        }
      />

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Asset</DialogTitle>
            <DialogDescription>
              Assign an available permanent asset to an active employee.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssign} className="space-y-4">
            <div className="space-y-2">
              <Label>Asset *</Label>
              <Select
                value={assignForm.asset_id || 'none'}
                onValueChange={(value) =>
                  setAssignForm((prev) => ({ ...prev, asset_id: value === 'none' ? '' : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select available asset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>
                    Select an asset
                  </SelectItem>
                  {availableAssets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name} ({asset.asset_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Employee *</Label>
              <Select
                value={assignForm.employee_id || 'none'}
                onValueChange={(value) =>
                  setAssignForm((prev) => ({ ...prev, employee_id: value === 'none' ? '' : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>
                    Select an employee
                  </SelectItem>
                  {activeEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.user?.full_name ?? 'Unknown'} ({employee.employee_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Select
                value={assignForm.location_id || 'none'}
                onValueChange={(value) =>
                  setAssignForm((prev) => ({
                    ...prev,
                    location_id: value === 'none' ? '' : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No location</SelectItem>
                  {activeLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {formatLocationName(location)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="assigned-date">Assigned Date</Label>
                <Input
                  id="assigned-date"
                  type="date"
                  value={assignForm.assigned_date}
                  onChange={(e) =>
                    setAssignForm((prev) => ({ ...prev, assigned_date: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expected-return-date">Expected Return Date</Label>
                <Input
                  id="expected-return-date"
                  type="date"
                  value={assignForm.expected_return_date}
                  onChange={(e) =>
                    setAssignForm((prev) => ({ ...prev, expected_return_date: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition-before">Condition Before</Label>
              <Input
                id="condition-before"
                value={assignForm.condition_before}
                onChange={(e) =>
                  setAssignForm((prev) => ({ ...prev, condition_before: e.target.value }))
                }
                placeholder="e.g. Good, minor scratches"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assign-notes">Notes</Label>
              <Textarea
                id="assign-notes"
                value={assignForm.notes}
                onChange={(e) => setAssignForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional assignment notes"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Assign Asset
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(returnTarget)} onOpenChange={(open) => !open && setReturnTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Return Asset</DialogTitle>
            <DialogDescription>
              Record the return of &quot;{returnTarget?.asset?.name}&quot; from{' '}
              {returnTarget?.employee?.user?.full_name ?? 'employee'}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReturn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="returned-date">Returned Date</Label>
              <Input
                id="returned-date"
                type="date"
                value={returnForm.returned_date}
                onChange={(e) =>
                  setReturnForm((prev) => ({ ...prev, returned_date: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition-after">Condition After</Label>
              <Input
                id="condition-after"
                value={returnForm.condition_after}
                onChange={(e) =>
                  setReturnForm((prev) => ({ ...prev, condition_after: e.target.value }))
                }
                placeholder="e.g. Good, needs cleaning"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="return-notes">Notes</Label>
              <Textarea
                id="return-notes"
                value={returnForm.notes}
                onChange={(e) => setReturnForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional return notes"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReturnTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={returnMutation.isPending}>
                Confirm Return
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

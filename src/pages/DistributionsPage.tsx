import { Plus, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
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
  useActiveDepartmentsForDistribution,
  useActiveEmployeesForDistribution,
  useCreateDistribution,
  useDeleteDistribution,
  useDisposableAssetsForDistribution,
  useDistributions,
  type DistributionWithRelations,
} from '@/hooks/useDistributions'
import { formatDate } from '@/lib/utils'

type RecipientType = 'employee' | 'department'

type DistributionFormState = {
  asset_id: string
  recipient_type: RecipientType
  employee_id: string
  department_id: string
  quantity: string
  notes: string
}

const emptyForm = (): DistributionFormState => ({
  asset_id: '',
  recipient_type: 'employee',
  employee_id: '',
  department_id: '',
  quantity: '1',
  notes: '',
})

export default function DistributionsPage() {
  const { profile } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reverseTarget, setReverseTarget] = useState<DistributionWithRelations | null>(null)
  const [form, setForm] = useState<DistributionFormState>(emptyForm)

  const { data: distributions = [], isLoading, error } = useDistributions()
  const { data: disposableAssets = [] } = useDisposableAssetsForDistribution()
  const { data: activeEmployees = [] } = useActiveEmployeesForDistribution()
  const { data: activeDepartments = [] } = useActiveDepartmentsForDistribution()
  const createMutation = useCreateDistribution()
  const deleteMutation = useDeleteDistribution()

  const selectedAsset = disposableAssets.find((asset) => asset.id === form.asset_id)

  function openCreate() {
    setForm(emptyForm())
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.asset_id) {
      toast.error('Please select an asset')
      return
    }

    const quantity = Number(form.quantity)
    if (!Number.isInteger(quantity) || quantity <= 0) {
      toast.error('Quantity must be a positive whole number')
      return
    }

    if (selectedAsset && quantity > selectedAsset.quantity) {
      toast.error(`Quantity cannot exceed available stock (${selectedAsset.quantity})`)
      return
    }

    const hasEmployee = form.recipient_type === 'employee' && Boolean(form.employee_id)
    const hasDepartment = form.recipient_type === 'department' && Boolean(form.department_id)

    if (!hasEmployee && !hasDepartment) {
      toast.error(
        form.recipient_type === 'employee'
          ? 'Please select an employee recipient'
          : 'Please select a department recipient',
      )
      return
    }

    if (hasEmployee && hasDepartment) {
      toast.error('Select either an employee or a department, not both')
      return
    }

    if (!profile?.id) {
      toast.error('User profile not loaded')
      return
    }

    try {
      await createMutation.mutateAsync({
        asset_id: form.asset_id,
        employee_id: hasEmployee ? form.employee_id : null,
        department_id: hasDepartment ? form.department_id : null,
        quantity,
        notes: form.notes.trim() || null,
        distributed_by: profile.id,
      })
      toast.success('Distribution recorded successfully')
      setDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create distribution')
    }
  }

  async function handleReverse() {
    if (!reverseTarget) return

    try {
      await deleteMutation.mutateAsync(reverseTarget.id)
      toast.success('Distribution reversed — stock restored')
      setReverseTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reverse distribution')
    }
  }

  const columns: DataTableColumn<DistributionWithRelations>[] = [
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
      key: 'recipient',
      header: 'Recipient',
      cell: (row) =>
        row.employee ? (
          <div>
            <p className="font-medium">{row.employee.user?.full_name ?? '—'}</p>
            <p className="text-xs text-muted-foreground">
              Employee · {row.employee.employee_number}
            </p>
          </div>
        ) : row.department ? (
          <div>
            <p className="font-medium">{row.department.name}</p>
            <p className="text-xs text-muted-foreground">Department</p>
          </div>
        ) : (
          '—'
        ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      cell: (row) => row.quantity,
    },
    {
      key: 'distributed_at',
      header: 'Distributed',
      cell: (row) => formatDate(row.distributed_at),
    },
    {
      key: 'distributed_by',
      header: 'Distributed By',
      cell: (row) => row.distributed_by_user?.full_name ?? '—',
    },
    {
      key: 'notes',
      header: 'Notes',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.notes ?? '—'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-[120px]',
      cell: (row) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setReverseTarget(row)}>
            <RotateCcw className="size-4" />
            Reverse
          </Button>
        </div>
      ),
    },
  ]

  if (isLoading) return <LoadingState message="Loading distributions..." />
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Distributions" description="Track disposable asset distributions" />
        <p className="text-sm text-destructive">Failed to load distributions: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Distributions"
        description="Track disposable asset distributions"
        actions={
          <Button onClick={openCreate} disabled={disposableAssets.length === 0}>
            <Plus className="size-4" />
            Distribute Asset
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={distributions}
        keyExtractor={(row) => row.id}
        emptyTitle="No distributions yet"
        emptyDescription="Distribute disposable assets to employees or departments."
        emptyAction={
          disposableAssets.length > 0 ? (
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Distribute Asset
            </Button>
          ) : undefined
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Distribute Asset</DialogTitle>
            <DialogDescription>
              Issue disposable stock to an employee or department.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Asset *</Label>
              <Select
                value={form.asset_id || 'none'}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    asset_id: value === 'none' ? '' : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select disposable asset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>
                    Select an asset
                  </SelectItem>
                  {disposableAssets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name} ({asset.asset_code}) — {asset.quantity} in stock
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Recipient Type *</Label>
              <Select
                value={form.recipient_type}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    recipient_type: value as RecipientType,
                    employee_id: '',
                    department_id: '',
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.recipient_type === 'employee' ? (
              <div className="space-y-2">
                <Label>Employee *</Label>
                <Select
                  value={form.employee_id || 'none'}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      employee_id: value === 'none' ? '' : value,
                      department_id: '',
                    }))
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
            ) : (
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select
                  value={form.department_id || 'none'}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      department_id: value === 'none' ? '' : value,
                      employee_id: '',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>
                      Select a department
                    </SelectItem>
                    {activeDepartments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={selectedAsset?.quantity}
                value={form.quantity}
                onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                placeholder="1"
              />
              {selectedAsset ? (
                <p className="text-xs text-muted-foreground">
                  Available stock: {selectedAsset.quantity}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="distribution-notes">Notes</Label>
              <Textarea
                id="distribution-notes"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional distribution notes"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Distribute Asset
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(reverseTarget)} onOpenChange={(open) => !open && setReverseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse Distribution</DialogTitle>
            <DialogDescription>
              Reverse the distribution of {reverseTarget?.quantity} × &quot;
              {reverseTarget?.asset?.name}&quot;? Stock will be restored.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReverseTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReverse}
              disabled={deleteMutation.isPending}
            >
              Reverse Distribution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

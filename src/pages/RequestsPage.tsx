import { Check, Plus, X } from 'lucide-react'
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
import { useCategories } from '@/hooks/useCategories'
import {
  useCancelRequest,
  useCreateRequest,
  useRequests,
  useUpdateRequestStatus,
  type RequestWithRelations,
} from '@/hooks/useRequests'
import { formatDate } from '@/lib/utils'

type RequestFormState = {
  asset_category_id: string
  quantity: string
  reason: string
}

const emptyForm: RequestFormState = {
  asset_category_id: '',
  quantity: '1',
  reason: '',
}

export default function RequestsPage() {
  const { isAdmin, profile } = useAuth()
  const employeeId = isAdmin ? undefined : profile?.employee?.id

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<RequestFormState>(emptyForm)
  const [actionTarget, setActionTarget] = useState<{
    request: RequestWithRelations
    action: 'approve' | 'reject'
  } | null>(null)

  const { data: requests = [], isLoading, error } = useRequests(employeeId)
  const { data: categories = [] } = useCategories()
  const createMutation = useCreateRequest()
  const updateStatusMutation = useUpdateRequestStatus()
  const cancelMutation = useCancelRequest()

  function openCreate() {
    setForm(emptyForm)
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const employeeRecordId = profile?.employee?.id
    if (!employeeRecordId) {
      toast.error('No employee record linked to your account')
      return
    }
    if (!form.asset_category_id) {
      toast.error('Please select a category')
      return
    }
    if (!form.reason.trim()) {
      toast.error('Reason is required')
      return
    }

    const quantity = parseInt(form.quantity, 10)
    if (!quantity || quantity <= 0) {
      toast.error('Enter a valid quantity')
      return
    }

    try {
      await createMutation.mutateAsync({
        employee_id: employeeRecordId,
        asset_category_id: form.asset_category_id,
        quantity,
        reason: form.reason.trim(),
        status: 'pending',
      })
      toast.success('Request submitted')
      setDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit request')
    }
  }

  async function handleStatusAction() {
    if (!actionTarget || !profile?.id) return

    try {
      await updateStatusMutation.mutateAsync({
        id: actionTarget.request.id,
        status: actionTarget.action === 'approve' ? 'approved' : 'rejected',
        approvedBy: profile.id,
      })
      toast.success(`Request ${actionTarget.action === 'approve' ? 'approved' : 'rejected'}`)
      setActionTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update request')
    }
  }

  async function handleCancel(request: RequestWithRelations) {
    try {
      await cancelMutation.mutateAsync(request.id)
      toast.success('Request cancelled')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel request')
    }
  }

  const columns: DataTableColumn<RequestWithRelations>[] = [
    ...(isAdmin
      ? [
          {
            key: 'employee',
            header: 'Employee',
            cell: (row: RequestWithRelations) => (
              <div>
                <p className="font-medium">{row.employee?.user?.full_name ?? '—'}</p>
                <p className="text-xs text-muted-foreground">{row.employee?.employee_number ?? ''}</p>
              </div>
            ),
          } satisfies DataTableColumn<RequestWithRelations>,
        ]
      : []),
    {
      key: 'category',
      header: 'Category',
      cell: (row) => row.category?.name ?? '—',
    },
    {
      key: 'quantity',
      header: 'Qty',
      cell: (row) => row.quantity,
    },
    {
      key: 'reason',
      header: 'Reason',
      cell: (row) => <span className="max-w-xs truncate text-sm">{row.reason}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} type="request" />,
    },
    {
      key: 'approved_by',
      header: 'Reviewed By',
      cell: (row) => row.approved_by_user?.full_name ?? '—',
    },
    {
      key: 'created_at',
      header: 'Submitted',
      cell: (row) => formatDate(row.created_at),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-[140px]',
      cell: (row) => (
        <div className="flex justify-end gap-1">
          {isAdmin && row.status === 'pending' ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActionTarget({ request: row, action: 'approve' })}
                aria-label="Approve request"
              >
                <Check className="size-4 text-green-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActionTarget({ request: row, action: 'reject' })}
                aria-label="Reject request"
              >
                <X className="size-4 text-destructive" />
              </Button>
            </>
          ) : null}
          {!isAdmin && row.status === 'pending' ? (
            <Button variant="ghost" size="sm" onClick={() => handleCancel(row)}>
              Cancel
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  if (isLoading) return <LoadingState message="Loading requests..." />
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Requests"
          description={isAdmin ? 'Review and manage asset requests' : 'Submit and track your asset requests'}
        />
        <p className="text-sm text-destructive">Failed to load requests: {error.message}</p>
      </div>
    )
  }

  const canCreate = !isAdmin && Boolean(profile?.employee?.id)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requests"
        description={
          isAdmin ? 'Review and manage asset requests' : 'Submit and track your asset requests'
        }
        actions={
          canCreate ? (
            <div className="flex flex-col items-end gap-1">
              <Button onClick={openCreate} disabled={categories.length === 0}>
                <Plus className="size-4" />
                New Request
              </Button>
              {categories.length === 0 ? (
                <p className="max-w-xs text-right text-xs text-slate-500">
                  No asset categories are available yet. Ask an admin to add categories.
                </p>
              ) : null}
            </div>
          ) : undefined
        }
      />

      <DataTable
        columns={columns}
        data={requests}
        keyExtractor={(row) => row.id}
        emptyTitle="No requests yet"
        emptyDescription={
          isAdmin
            ? 'Employee asset requests will appear here for review.'
            : 'Submit a request for assets you need.'
        }
        emptyAction={
          canCreate && categories.length > 0 ? (
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              New Request
            </Button>
          ) : undefined
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Asset Request</DialogTitle>
            <DialogDescription>
              Request assets from inventory. Your manager will review the request.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={form.asset_category_id || 'none'}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    asset_category_id: value === 'none' ? '' : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>
                    Select a category
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                value={form.reason}
                onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Explain why you need this asset"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(actionTarget)} onOpenChange={(open) => !open && setActionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionTarget?.action === 'approve' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
            <DialogDescription>
              {actionTarget?.action === 'approve'
                ? `Approve the request from ${actionTarget.request.employee?.user?.full_name ?? 'employee'} for ${actionTarget.request.quantity} × ${actionTarget.request.category?.name ?? 'items'}?`
                : `Reject the request from ${actionTarget?.request.employee?.user?.full_name ?? 'employee'}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={actionTarget?.action === 'reject' ? 'destructive' : 'default'}
              onClick={handleStatusAction}
              disabled={updateStatusMutation.isPending}
            >
              {actionTarget?.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

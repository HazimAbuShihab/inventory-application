import { Pencil, Plus, Trash2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateDepartment,
  useDeleteDepartment,
  useDepartments,
  useUpdateDepartment,
} from '@/hooks/useDepartments'
import { formatDate } from '@/lib/utils'
import type { Tables } from '@/types/database'

type DepartmentFormState = {
  name: string
  description: string
}

const emptyForm: DepartmentFormState = { name: '', description: '' }

export default function DepartmentsPage() {
  const { data: departments = [], isLoading, error } = useDepartments()
  const createMutation = useCreateDepartment()
  const updateMutation = useUpdateDepartment()
  const deleteMutation = useDeleteDepartment()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Tables<'departments'> | null>(null)
  const [form, setForm] = useState<DepartmentFormState>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<Tables<'departments'> | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(department: Tables<'departments'>) {
    setEditing(department)
    setForm({
      name: department.name,
      description: department.description ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Department name is required')
      return
    }

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          name: form.name.trim(),
          description: form.description.trim() || null,
        })
        toast.success('Department updated')
      } else {
        await createMutation.mutateAsync({
          name: form.name.trim(),
          description: form.description.trim() || null,
        })
        toast.success('Department created')
      }
      setDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save department')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return

    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success('Department deleted')
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete department')
    }
  }

  const columns: DataTableColumn<Tables<'departments'>>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      cell: (row) => <span className="text-muted-foreground">{row.description ?? '—'}</span>,
    },
    {
      key: 'created_at',
      header: 'Created',
      cell: (row) => formatDate(row.created_at),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-[100px]',
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label="Edit department">
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteTarget(row)}
            aria-label="Delete department"
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  if (isLoading) return <LoadingState message="Loading departments..." />
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Departments" description="Manage organizational departments" />
        <p className="text-sm text-destructive">Failed to load departments: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Manage organizational departments"
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add Department
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={departments}
        keyExtractor={(row) => row.id}
        emptyTitle="No departments yet"
        emptyDescription="Create your first department to organize employees and assets."
        emptyAction={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add Department
          </Button>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Department' : 'New Department'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update department details.' : 'Add a new organizational department.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Name *</Label>
              <Input
                id="dept-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Engineering"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-description">Description</Label>
              <Textarea
                id="dept-description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                rows={3}
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
                {editing ? 'Save Changes' : 'Create Department'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

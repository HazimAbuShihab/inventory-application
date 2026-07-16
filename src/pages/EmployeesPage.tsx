import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { LoadingState } from '@/components/common/LoadingState'
import { MaterialIcon } from '@/components/common/MaterialIcon'
import { PageHeader } from '@/components/common/PageHeader'
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
import { useDepartments } from '@/hooks/useDepartments'
import {
  useActivateEmployee,
  useCreateEmployee,
  useDeactivateEmployee,
  useEmployeeAssignments,
  useEmployees,
  useUpdateEmployee,
  useUsersWithoutEmployee,
  type EmployeeWithRelations,
} from '@/hooks/useEmployees'
import { useLocations } from '@/hooks/useLocations'
import { cn, formatDate, formatLocation, labelize } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

type EmployeeFormState = {
  user_id: string
  employee_number: string
  job_title: string
  department_id: string
  work_location_id: string
  joining_date: string
  status: string
}

const emptyForm: EmployeeFormState = {
  user_id: '',
  employee_number: '',
  job_title: '',
  department_id: '',
  work_location_id: '',
  joining_date: '',
  status: 'active',
}

function daysBetween(from: string, to = new Date()) {
  const start = new Date(from)
  const end = to instanceof Date ? to : new Date(to)
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000))
}

function isOverdue(assignment: { is_active: boolean; expected_return_date: string | null }) {
  if (!assignment.is_active || !assignment.expected_return_date) return false
  return new Date(assignment.expected_return_date) < new Date()
}

export default function EmployeesPage() {
  const { data: employees = [], isLoading, error } = useEmployees()
  const { data: departments = [] } = useDepartments()
  const { data: locations = [] } = useLocations({ activeOnly: true })
  const { data: usersWithoutEmployee = [] } = useUsersWithoutEmployee()
  const createMutation = useCreateEmployee()
  const updateMutation = useUpdateEmployee()
  const activateMutation = useActivateEmployee()
  const deactivateMutation = useDeactivateEmployee()

  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<EmployeeWithRelations | null>(null)
  const [form, setForm] = useState<EmployeeFormState>(emptyForm)
  const [toggleTarget, setToggleTarget] = useState<EmployeeWithRelations | null>(null)
  const [viewing, setViewing] = useState<EmployeeWithRelations | null>(null)
  const [fetchingNumber, setFetchingNumber] = useState(false)

  const { data: assignments = [], isLoading: assignmentsLoading } = useEmployeeAssignments(
    viewing?.id,
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return employees.filter((employee) => {
      if (departmentFilter !== 'all' && employee.department_id !== departmentFilter) return false
      if (activeFilter === 'active' && !employee.is_active) return false
      if (activeFilter === 'inactive' && employee.is_active) return false
      if (!q) return true
      return (
        employee.employee_number.toLowerCase().includes(q) ||
        (employee.user?.full_name ?? '').toLowerCase().includes(q) ||
        (employee.user?.email ?? '').toLowerCase().includes(q) ||
        (employee.job_title ?? '').toLowerCase().includes(q)
      )
    })
  }, [employees, search, departmentFilter, activeFilter])

  async function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
    setFetchingNumber(true)
    try {
      const { data, error: rpcError } = await supabase.rpc('next_employee_number')
      if (rpcError) throw rpcError
      if (data) {
        setForm((prev) => ({ ...prev, employee_number: data }))
      }
    } catch {
      // User can enter employee number manually
    } finally {
      setFetchingNumber(false)
    }
  }

  function openEdit(employee: EmployeeWithRelations) {
    setEditing(employee)
    setForm({
      user_id: employee.user_id,
      employee_number: employee.employee_number,
      job_title: employee.job_title ?? '',
      department_id: employee.department_id ?? '',
      work_location_id: employee.work_location_id ?? '',
      joining_date: employee.joining_date ?? '',
      status: employee.status,
    })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.employee_number.trim()) {
      toast.error('Employee number is required')
      return
    }

    if (!editing && !form.user_id) {
      toast.error('Please select a user')
      return
    }

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          employee_number: form.employee_number.trim(),
          job_title: form.job_title.trim() || null,
          department_id: form.department_id || null,
          work_location_id: form.work_location_id || null,
          joining_date: form.joining_date || null,
          status: form.status,
        })
        toast.success('Employee updated')
      } else {
        await createMutation.mutateAsync({
          user_id: form.user_id,
          employee_number: form.employee_number.trim(),
          job_title: form.job_title.trim() || null,
          department_id: form.department_id || null,
          work_location_id: form.work_location_id || null,
          joining_date: form.joining_date || null,
          status: form.status,
        })
        toast.success('Employee created')
      }
      setDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save employee')
    }
  }

  async function handleToggleActive() {
    if (!toggleTarget) return

    try {
      if (toggleTarget.is_active) {
        await deactivateMutation.mutateAsync(toggleTarget.id)
        toast.success('Employee deactivated')
      } else {
        await activateMutation.mutateAsync(toggleTarget.id)
        toast.success('Employee activated')
      }
      setToggleTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update employee status')
    }
  }

  const columns: DataTableColumn<EmployeeWithRelations>[] = [
    {
      key: 'employee_number',
      header: 'Employee ID',
      cell: (row) => <span className="font-mono text-sm font-medium">{row.employee_number}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      cell: (row) => <span className="font-medium text-slate-900">{row.user?.full_name ?? '—'}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      cell: (row) => <span className="text-slate-500">{row.user?.email ?? '—'}</span>,
    },
    {
      key: 'department',
      header: 'Department',
      cell: (row) => row.department?.name ?? '—',
    },
    {
      key: 'is_active',
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.is_active ? 'success' : 'secondary'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-[140px]',
      cell: (row) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewing(row)}
            aria-label="View employee"
            className="text-primary hover:text-primary"
          >
            <MaterialIcon name="visibility" className="text-[20px]" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label="Edit employee">
            <MaterialIcon name="edit" className="text-[20px]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setToggleTarget(row)}
            aria-label={row.is_active ? 'Deactivate employee' : 'Activate employee'}
          >
            <MaterialIcon
              name={row.is_active ? 'block' : 'check_circle'}
              className={cn('text-[20px]', row.is_active ? 'text-orange-600' : 'text-green-600')}
            />
          </Button>
        </div>
      ),
    },
  ]

  if (isLoading) return <LoadingState message="Loading employees..." />
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Employees" description="Manage employee records and assignments" icon="group" />
        <p className="text-sm text-destructive">Failed to load employees: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Manage employee records and assignments"
        icon="group"
        actions={
          <div className="flex flex-col items-end gap-1">
            <Button onClick={openCreate} disabled={usersWithoutEmployee.length === 0}>
              <MaterialIcon name="add" className="text-[18px]" />
              Add New Employee
            </Button>
            {usersWithoutEmployee.length === 0 ? (
              <p className="max-w-xs text-right text-xs text-slate-500">
                All users already have employee records. Create a user first in User Management.
              </p>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-[220px] flex-1">
          <MaterialIcon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400"
          />
          <Input
            placeholder="Search by name, email, or employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-50 pl-10"
          />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={activeFilter}
          onValueChange={(v) => setActiveFilter(v as 'all' | 'active' | 'inactive')}
        >
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => setViewing(row)}
          emptyTitle="No employees found"
          emptyDescription="Try adjusting filters or add a new employee."
          emptyIcon="group"
          emptyAction={
            usersWithoutEmployee.length > 0 ? (
              <Button onClick={openCreate}>
                <MaterialIcon name="add" className="text-[18px]" />
                Add Employee
              </Button>
            ) : undefined
          }
        />

      {/* View employee + assigned assets */}
      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>Profile information and assigned assets</DialogDescription>
          </DialogHeader>

          {viewing ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Employee ID" value={viewing.employee_number} />
                <DetailField label="Department" value={viewing.department?.name ?? '—'} />
                <DetailField label="Full Name" value={viewing.user?.full_name ?? '—'} />
                <DetailField label="Email" value={viewing.user?.email ?? '—'} />
                <DetailField label="Job Title" value={viewing.job_title ?? '—'} />
                <DetailField label="Start Date" value={formatDate(viewing.joining_date)} />
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-700">Status</p>
                  <Badge variant={viewing.is_active ? 'success' : 'secondary'}>
                    {viewing.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="ml-2 text-sm text-slate-500">{labelize(viewing.status)}</span>
                </div>
                <DetailField
                  label="Work Location"
                  value={
                    viewing.work_location ? formatLocation(viewing.work_location) : 'Not assigned'
                  }
                />
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="mb-3 flex items-center gap-2">
                  <MaterialIcon name="devices" className="text-[22px] text-primary" />
                  <h4 className="text-base font-semibold text-slate-900">Assigned Assets</h4>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {assignments.length}
                  </span>
                </div>

                {assignmentsLoading ? (
                  <div className="flex justify-center py-8">
                    <MaterialIcon
                      name="progress_activity"
                      className="animate-spin text-[32px] text-primary"
                    />
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="py-8 text-center">
                    <MaterialIcon name="inventory_2" className="text-[48px] text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500">No assets assigned</p>
                  </div>
                ) : (
                  <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                    {assignments.map((assignment) => {
                      const active = assignment.is_active ?? !assignment.returned_date
                      const overdue = isOverdue({
                        is_active: active,
                        expected_return_date: assignment.expected_return_date,
                      })
                      return (
                        <div
                          key={assignment.id}
                          className={cn(
                            'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                            active
                              ? 'border-green-200 bg-green-50'
                              : 'border-slate-200 bg-slate-50',
                          )}
                        >
                          <div
                            className={cn(
                              'flex size-10 shrink-0 items-center justify-center rounded-lg',
                              active ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500',
                            )}
                          >
                            <MaterialIcon
                              name={active ? 'laptop_mac' : 'history'}
                              className="text-[20px]"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                {assignment.asset ? (
                                  <Link
                                    to={`/assets/${assignment.asset.id}`}
                                    className="truncate text-sm font-semibold text-slate-900 hover:text-primary"
                                    onClick={() => setViewing(null)}
                                  >
                                    {assignment.asset.name}
                                  </Link>
                                ) : (
                                  <p className="text-sm font-semibold text-slate-900">Unknown asset</p>
                                )}
                                {assignment.asset?.barcode ? (
                                  <div className="mt-1 flex items-center gap-1.5">
                                    <MaterialIcon name="qr_code_2" className="text-[12px] text-primary" />
                                    <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                                      {assignment.asset.barcode}
                                    </span>
                                  </div>
                                ) : assignment.asset?.serial_number ? (
                                  <div className="mt-1 flex items-center gap-1.5">
                                    <MaterialIcon name="tag" className="text-[12px] text-slate-500" />
                                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                                      SN: {assignment.asset.serial_number}
                                    </span>
                                  </div>
                                ) : assignment.asset?.asset_code ? (
                                  <p className="mt-0.5 font-mono text-xs text-slate-500">
                                    {assignment.asset.asset_code}
                                  </p>
                                ) : null}
                              </div>
                              <Badge variant={active ? 'success' : 'secondary'} className="shrink-0">
                                {active ? 'Active' : 'Returned'}
                              </Badge>
                            </div>

                            <div className="space-y-1 text-xs text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <MaterialIcon name="calendar_today" className="text-[14px]" />
                                <span>Assigned: {formatDate(assignment.assigned_date)}</span>
                              </div>
                              {assignment.location ? (
                                <div className="flex items-center gap-1.5">
                                  <MaterialIcon name="location_on" className="text-[14px]" />
                                  <span>{formatLocation(assignment.location)}</span>
                                </div>
                              ) : null}
                              {active && assignment.expected_return_date ? (
                                <div className="flex items-center gap-1.5">
                                  <MaterialIcon name="event" className="text-[14px]" />
                                  <span>
                                    Expected return: {formatDate(assignment.expected_return_date)}
                                  </span>
                                  {overdue ? (
                                    <span className="font-medium text-red-600">(Overdue!)</span>
                                  ) : null}
                                </div>
                              ) : null}
                              {!active && assignment.returned_date ? (
                                <div className="flex items-center gap-1.5">
                                  <MaterialIcon name="check_circle" className="text-[14px]" />
                                  <span>Returned: {formatDate(assignment.returned_date)}</span>
                                </div>
                              ) : null}
                              {active ? (
                                <div className="flex items-center gap-1.5">
                                  <MaterialIcon name="schedule" className="text-[14px]" />
                                  <span>{daysBetween(assignment.assigned_date)} days in use</span>
                                </div>
                              ) : null}
                              {assignment.notes ? (
                                <div className="mt-2 flex items-start gap-1.5 border-t border-slate-200 pt-2 italic">
                                  <MaterialIcon name="note" className="mt-0.5 text-[14px]" />
                                  <span>{assignment.notes}</span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>
              Close
            </Button>
            {viewing ? (
              <Button
                onClick={() => {
                  openEdit(viewing)
                  setViewing(null)
                }}
              >
                Edit Employee
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Employee' : 'New Employee'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update employee record details.'
                : 'Link an existing user account to a new employee record.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {editing ? (
              <div className="space-y-2">
                <Label>User</Label>
                <Input
                  value={`${editing.user?.full_name ?? ''} (${editing.user?.email ?? ''})`}
                  disabled
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>User *</Label>
                <Select
                  value={form.user_id || 'none'}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, user_id: value === 'none' ? '' : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user without employee record" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>
                      Select a user
                    </SelectItem>
                    {usersWithoutEmployee.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="emp-number">Employee Number *</Label>
              <Input
                id="emp-number"
                value={form.employee_number}
                onChange={(e) => setForm((prev) => ({ ...prev, employee_number: e.target.value }))}
                placeholder={fetchingNumber ? 'Generating...' : 'EMP-001'}
                disabled={fetchingNumber}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-title">Job Title</Label>
              <Input
                id="job-title"
                value={form.job_title}
                onChange={(e) => setForm((prev) => ({ ...prev, job_title: e.target.value }))}
                placeholder="e.g. Software Engineer"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={form.department_id || 'none'}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, department_id: value === 'none' ? '' : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Work Location</Label>
                <Select
                  value={form.work_location_id || 'none'}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, work_location_id: value === 'none' ? '' : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No location</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {formatLocation(loc)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="joining-date">Joining Date</Label>
                <Input
                  id="joining-date"
                  type="date"
                  value={form.joining_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, joining_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? 'Save Changes' : 'Create Employee'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(toggleTarget)} onOpenChange={(open) => !open && setToggleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{toggleTarget?.is_active ? 'Deactivate Employee' : 'Activate Employee'}</DialogTitle>
            <DialogDescription>
              {toggleTarget?.is_active
                ? `Deactivate "${toggleTarget?.user?.full_name}"? Deactivation is blocked while active asset assignments exist.`
                : `Reactivate "${toggleTarget?.user?.full_name}"?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={toggleTarget?.is_active ? 'destructive' : 'default'}
              onClick={handleToggleActive}
              disabled={deactivateMutation.isPending || activateMutation.isPending}
            >
              {toggleTarget?.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-slate-700">{label}</p>
      <p className="text-slate-900">{value}</p>
    </div>
  )
}

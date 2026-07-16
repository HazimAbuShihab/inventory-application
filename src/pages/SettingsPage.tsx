import { useState } from 'react'
import { toast } from 'sonner'

import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { LoadingState } from '@/components/common/LoadingState'
import { MaterialIcon } from '@/components/common/MaterialIcon'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  useAdminCreateUser,
  useAllUsers,
  useRoles,
  useUpdateUserAdmin,
  type UserWithRole,
} from '@/hooks/useUsers'
import { getRoleLabel, labelize } from '@/lib/utils'
import type { UserRole } from '@/types/database'

type CreateUserFormState = {
  p_email: string
  p_password: string
  p_full_name: string
  p_role_name: UserRole
  p_phone: string
  p_department_id: string
  p_employee_number: string
  p_job_title: string
}

type EditUserFormState = {
  full_name: string
  email: string
  phone: string
  role_id: string
  status: string
}

const emptyCreateUserForm: CreateUserFormState = {
  p_email: '',
  p_password: '',
  p_full_name: '',
  p_role_name: 'employee',
  p_phone: '',
  p_department_id: '',
  p_employee_number: '',
  p_job_title: '',
}

export default function SettingsPage() {
  const { data: departments = [] } = useDepartments()
  const { data: roles = [] } = useRoles()
  const { data: users = [], isLoading: usersLoading } = useAllUsers(true)

  const updateUserMutation = useUpdateUserAdmin()
  const createUserMutation = useAdminCreateUser()

  const [createUserForm, setCreateUserForm] = useState<CreateUserFormState>(emptyCreateUserForm)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null)
  const [editForm, setEditForm] = useState<EditUserFormState>({
    full_name: '',
    email: '',
    phone: '',
    role_id: '',
    status: 'active',
  })

  function openEditUser(user: UserWithRole) {
    setEditingUser(user)
    setEditForm({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone ?? '',
      role_id: user.role_id,
      status: user.status,
    })
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()

    if (!createUserForm.p_email.trim() || !createUserForm.p_password || !createUserForm.p_full_name.trim()) {
      toast.error('Email, password, and full name are required')
      return
    }

    try {
      await createUserMutation.mutateAsync({
        p_email: createUserForm.p_email.trim(),
        p_password: createUserForm.p_password,
        p_full_name: createUserForm.p_full_name.trim(),
        p_role_name: createUserForm.p_role_name,
        p_phone: createUserForm.p_phone.trim() || null,
        p_department_id: createUserForm.p_department_id || null,
        p_employee_number: createUserForm.p_employee_number.trim() || null,
        p_job_title: createUserForm.p_job_title.trim() || null,
      })
      toast.success('User created successfully')
      setCreateUserForm(emptyCreateUserForm)
      setShowCreateUser(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user')
    }
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return

    if (!editForm.full_name.trim()) {
      toast.error('Full name is required')
      return
    }
    if (!editForm.email.trim()) {
      toast.error('Email is required')
      return
    }

    try {
      await updateUserMutation.mutateAsync({
        id: editingUser.id,
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone,
        role_id: editForm.role_id,
        status: editForm.status,
      })
      toast.success(`Updated ${editForm.full_name.trim()}`)
      setEditingUser(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  const userColumns: DataTableColumn<UserWithRole>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.full_name}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      cell: (row) => row.department?.name ?? '—',
    },
    {
      key: 'role',
      header: 'Role',
      cell: (row) => <Badge variant="outline">{getRoleLabel(row.role?.name)}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'secondary'}>
          {labelize(row.status)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'w-[100px]',
      cell: (row) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => openEditUser(row)}>
            <MaterialIcon name="edit" className="text-[18px]" />
            Edit
          </Button>
        </div>
      ),
    },
  ]

  if (usersLoading) return <LoadingState message="Loading users..." />

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Create users and edit name, email, role, and status"
        icon="manage_accounts"
        actions={
          <Button onClick={() => setShowCreateUser((prev) => !prev)}>
            <MaterialIcon name={showCreateUser ? 'close' : 'person_add'} className="text-[18px]" />
            {showCreateUser ? 'Cancel' : 'Create User'}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MaterialIcon name="shield_person" className="text-[22px]" />
            System Users
          </CardTitle>
          <CardDescription>
            Click Edit to change a user&apos;s name, email, phone, role, or status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {showCreateUser ? (
            <form
              onSubmit={handleCreateUser}
              className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"
            >
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="create-email">Email *</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createUserForm.p_email}
                  onChange={(e) => setCreateUserForm((prev) => ({ ...prev, p_email: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-password">Password *</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={createUserForm.p_password}
                  onChange={(e) => setCreateUserForm((prev) => ({ ...prev, p_password: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-name">Full Name *</Label>
                <Input
                  id="create-name"
                  value={createUserForm.p_full_name}
                  onChange={(e) => setCreateUserForm((prev) => ({ ...prev, p_full_name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Role *</Label>
                <Select
                  value={createUserForm.p_role_name}
                  onValueChange={(value) =>
                    setCreateUserForm((prev) => ({ ...prev, p_role_name: value as UserRole }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.name}>
                        {getRoleLabel(role.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-phone">Phone</Label>
                <Input
                  id="create-phone"
                  value={createUserForm.p_phone}
                  onChange={(e) => setCreateUserForm((prev) => ({ ...prev, p_phone: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={createUserForm.p_department_id || 'none'}
                  onValueChange={(value) =>
                    setCreateUserForm((prev) => ({
                      ...prev,
                      p_department_id: value === 'none' ? '' : value,
                    }))
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
                <Label htmlFor="create-emp-number">Employee Number</Label>
                <Input
                  id="create-emp-number"
                  value={createUserForm.p_employee_number}
                  onChange={(e) =>
                    setCreateUserForm((prev) => ({ ...prev, p_employee_number: e.target.value }))
                  }
                  placeholder="Required for employee role"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-job-title">Job Title</Label>
                <Input
                  id="create-job-title"
                  value={createUserForm.p_job_title}
                  onChange={(e) => setCreateUserForm((prev) => ({ ...prev, p_job_title: e.target.value }))}
                />
              </div>

              <div className="sm:col-span-2">
                <Button type="submit" disabled={createUserMutation.isPending}>
                  Create User
                </Button>
              </div>
            </form>
          ) : null}

          <DataTable
            columns={userColumns}
            data={users}
            keyExtractor={(row) => row.id}
            emptyTitle="No users found"
          />
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update name, email, phone, role, and account status
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-full-name">Full Name *</Label>
              <Input
                id="edit-full-name"
                value={editForm.full_name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, full_name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
              <p className="text-xs text-slate-500">
                Changing email also updates the login email for this account.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Optional"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={editForm.role_id}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, role_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {getRoleLabel(role.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

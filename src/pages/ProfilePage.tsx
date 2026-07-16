import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { LoadingState } from '@/components/common/LoadingState'
import { MaterialIcon } from '@/components/common/MaterialIcon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useChangePassword, useUpdateProfile } from '@/hooks/useUsers'
import { cn, getRoleLabel } from '@/lib/utils'
import type { UserRole } from '@/types/database'

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  }
}

function roleBadgeClass(role?: string | null) {
  switch (role as UserRole | undefined) {
    case 'super_admin':
      return 'bg-red-100 text-red-800'
    case 'it_admin':
    case 'inventory_admin':
      return 'bg-blue-100 text-blue-800'
    case 'facilities_admin':
      return 'bg-indigo-100 text-indigo-800'
    case 'hr':
      return 'bg-purple-100 text-purple-800'
    case 'employee':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function roleIcon(role?: string | null) {
  switch (role as UserRole | undefined) {
    case 'super_admin':
      return 'admin_panel_settings'
    case 'it_admin':
    case 'inventory_admin':
      return 'engineering'
    case 'facilities_admin':
      return 'domain'
    case 'hr':
      return 'group'
    default:
      return 'person'
  }
}

function formatMemberSince(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth()
  const updateProfileMutation = useUpdateProfile()
  const changePasswordMutation = useChangePassword()

  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (!profile) return
    const { firstName: first, lastName: last } = splitName(profile.full_name)
    setFirstName(first)
    setLastName(last)
    setPhone(profile.phone ?? '')
  }, [profile])

  if (!profile) return <LoadingState message="Loading profile..." />

  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0) || profile.full_name.charAt(1) || ''}`.toUpperCase() ||
    'U'
  const isActive = profile.status === 'active'
  const passwordMismatch =
    confirmPassword.length > 0 && newPassword.length > 0 && newPassword !== confirmPassword

  function resetProfileForm() {
    if (!profile) return
    const { firstName: first, lastName: last } = splitName(profile.full_name)
    setFirstName(first)
    setLastName(last)
    setPhone(profile.phone ?? '')
  }

  function toggleEditProfile() {
    if (isEditingProfile) resetProfileForm()
    setIsEditingProfile((v) => !v)
  }

  function toggleChangePassword() {
    if (isChangingPassword) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
    setIsChangingPassword((v) => !v)
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return

    if (firstName.trim().length < 2) {
      toast.error('First name must be at least 2 characters')
      return
    }

    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')

    try {
      await updateProfileMutation.mutateAsync({
        userId: profile.id,
        full_name: fullName,
        phone: phone.trim() || null,
        department_id: profile.department_id,
      })
      await refreshProfile()
      setIsEditingProfile(false)
      toast.success('Your profile has been successfully updated.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile')
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setIsChangingPassword(false)
      toast.success('Your password has been successfully updated.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password')
    }
  }

  const fieldClass = (editing: boolean) =>
    cn(
      'w-full rounded-lg border px-3 py-2 text-sm transition-colors',
      editing
        ? 'border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary'
        : 'border-transparent bg-slate-50 text-slate-600',
    )

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-white shadow-lg">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{profile.full_name || 'User Profile'}</h1>
            <p className="text-slate-600">Manage your account settings and preferences</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
              roleBadgeClass(profile.role?.name),
            )}
          >
            <MaterialIcon name={roleIcon(profile.role?.name)} className="mr-1 text-[16px]" />
            {getRoleLabel(profile.role?.name)}
          </span>
          {isActive ? (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              <span className="mr-1.5 size-1.5 rounded-full bg-green-500" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
              <span className="mr-1.5 size-1.5 rounded-full bg-red-500" />
              {profile.status === 'suspended' ? 'Suspended' : 'Inactive'}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <MaterialIcon name="person" />
              Profile Information
            </h2>
            <button
              type="button"
              onClick={toggleEditProfile}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                isEditingProfile
                  ? 'bg-red-50 text-red-700 hover:bg-red-100'
                  : 'bg-primary/10 text-primary hover:bg-primary/20',
              )}
            >
              <MaterialIcon name={isEditingProfile ? 'close' : 'edit'} className="text-[18px]" />
              {isEditingProfile ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-2">First Name</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    readOnly={!isEditingProfile}
                    className={fieldClass(isEditingProfile)}
                  />
                </div>
                <div>
                  <Label className="mb-2">Last Name</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    readOnly={!isEditingProfile}
                    className={fieldClass(isEditingProfile)}
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2">Email Address</Label>
                <Input value={profile.email} readOnly className={fieldClass(false)} />
              </div>

              <div>
                <Label className="mb-2">Phone Number</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  readOnly={!isEditingProfile}
                  placeholder="Optional"
                  className={fieldClass(isEditingProfile)}
                />
              </div>

              {profile.department ? (
                <div>
                  <Label className="mb-2">Department</Label>
                  <Input value={profile.department.name} readOnly className={fieldClass(false)} />
                </div>
              ) : null}
            </div>

            {isEditingProfile ? (
              <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
                <Button type="button" variant="ghost" onClick={toggleEditProfile}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? (
                    <>
                      <MaterialIcon name="progress_activity" className="animate-spin text-[18px]" />
                      Updating...
                    </>
                  ) : (
                    'Update Profile'
                  )}
                </Button>
              </div>
            ) : null}
          </form>
        </div>

        <div className="space-y-8">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <MaterialIcon name="badge" />
              Account Details
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 py-2">
                <span className="text-sm font-medium text-slate-600">User ID</span>
                <span className="max-w-[55%] truncate font-mono text-sm text-slate-900" title={profile.id}>
                  {profile.id}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 py-2">
                <span className="text-sm font-medium text-slate-600">Email</span>
                <span className="text-sm text-slate-900">{profile.email}</span>
              </div>
              {profile.employee?.employee_number ? (
                <div className="flex items-center justify-between border-b border-slate-100 py-2">
                  <span className="text-sm font-medium text-slate-600">Employee ID</span>
                  <span className="font-mono text-sm text-slate-900">
                    {profile.employee.employee_number}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-slate-600">Member Since</span>
                <span className="text-sm text-slate-900">{formatMemberSince(profile.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <MaterialIcon name="security" />
                Security
              </h2>
              <button
                type="button"
                onClick={toggleChangePassword}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  isChangingPassword
                    ? 'bg-red-50 text-red-700 hover:bg-red-100'
                    : 'bg-primary/10 text-primary hover:bg-primary/20',
                )}
              >
                <MaterialIcon name={isChangingPassword ? 'close' : 'key'} className="text-[18px]" />
                {isChangingPassword ? 'Cancel' : 'Change Password'}
              </button>
            </div>

            {!isChangingPassword ? (
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4">
                <MaterialIcon name="check_circle" className="text-green-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Password Protected</p>
                  <p className="text-xs text-slate-600">Your account is secured with a password</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <Label className="mb-2">Current Password</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    autoComplete="current-password"
                    required
                  />
                </div>
                <div>
                  <Label className="mb-2">New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div>
                  <Label className="mb-2">Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    autoComplete="new-password"
                    required
                  />
                  {passwordMismatch ? (
                    <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                  ) : null}
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                  <Button type="button" variant="ghost" onClick={toggleChangePassword}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={changePasswordMutation.isPending || passwordMismatch}
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <MaterialIcon name="progress_activity" className="animate-spin text-[18px]" />
                        Changing...
                      </>
                    ) : (
                      'Change Password'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

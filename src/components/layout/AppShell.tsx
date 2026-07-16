import { useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { MaterialIcon } from '@/components/common/MaterialIcon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'
import { cn, getRoleLabel } from '@/lib/utils'
import type { UserRole } from '@/types/database'

type NavItem = {
  label: string
  to: string
  icon: string
  roles?: UserRole[]
}

type NavSection = {
  title: string
  items: NavItem[]
}

const inventoryRoles: UserRole[] = ['it_admin', 'facilities_admin', 'inventory_admin', 'super_admin']
const orgRoles: UserRole[] = ['hr', 'it_admin', 'facilities_admin', 'inventory_admin', 'super_admin']
const reportRoles: UserRole[] = ['it_admin', 'facilities_admin', 'inventory_admin', 'hr', 'super_admin']

const sections: NavSection[] = [
  {
    title: 'Main Menu',
    items: [
      { label: 'Dashboards', to: '/dashboard', icon: 'dashboard' },
      { label: 'Assets', to: '/assets', icon: 'inventory_2' },
      { label: 'Assignments', to: '/assignments', icon: 'assignment', roles: inventoryRoles },
      { label: 'Categories', to: '/categories', icon: 'category', roles: inventoryRoles },
    ],
  },
  {
    title: 'Organization',
    items: [
      { label: 'Employees', to: '/employees', icon: 'group', roles: orgRoles },
      { label: 'Departments', to: '/departments', icon: 'business', roles: orgRoles },
      { label: 'Locations', to: '/locations', icon: 'location_on', roles: inventoryRoles },
    ],
  },
  {
    title: 'Consumables',
    items: [
      { label: 'Distributions', to: '/distributions', icon: 'local_shipping', roles: inventoryRoles },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Requests', to: '/requests', icon: 'request_quote' },
      { label: 'Maintenance', to: '/maintenance', icon: 'build' },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { label: 'Reports', to: '/reports', icon: 'bar_chart', roles: reportRoles },
      { label: 'Audit Logs', to: '/audit-logs', icon: 'history', roles: ['super_admin'] },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'User Management', to: '/settings', icon: 'manage_accounts', roles: ['super_admin'] },
    ],
  },
]

const dashboardLinks: { label: string; to: string; icon: string; roles: UserRole[] }[] = [
  { label: 'Admin Dashboard', to: '/dashboard/admin', icon: 'admin_panel_settings', roles: ['super_admin'] },
  { label: 'IT Dashboard', to: '/dashboard/it', icon: 'computer', roles: ['super_admin', 'it_admin', 'inventory_admin'] },
  {
    label: 'Facilities Dashboard',
    to: '/dashboard/facilities',
    icon: 'domain',
    roles: ['super_admin', 'facilities_admin', 'inventory_admin'],
  },
  { label: 'HR Dashboard', to: '/dashboard/hr', icon: 'group', roles: ['super_admin', 'hr'] },
  { label: 'General Dashboard', to: '/dashboard/general', icon: 'dashboard', roles: [] },
]

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { hasRole } = useAuth()
  const location = useLocation()
  const [dashOpen, setDashOpen] = useState(location.pathname.startsWith('/dashboard'))

  const visibleSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => !item.roles || hasRole(...item.roles)),
        }))
        .filter((section) => section.items.length > 0),
    [hasRole],
  )

  const visibleDashboards = dashboardLinks.filter(
    (d) => d.roles.length === 0 || hasRole(...d.roles),
  )

  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
      {visibleSections.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {section.title}
          </p>
          <div className="flex flex-col gap-1">
            {section.items.map((item) =>
              item.to === '/dashboard' ? (
                <div key={item.to}>
                  <div
                    className={cn(
                      'flex min-h-[44px] w-full items-center rounded-lg text-sm font-medium transition-colors',
                      location.pathname.startsWith('/dashboard')
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    <NavLink
                      to="/dashboard"
                      onClick={onNavigate}
                      className="flex min-h-[44px] flex-1 items-center gap-3 px-3 py-2.5"
                    >
                      <MaterialIcon name={item.icon} className="text-[20px]" />
                      <span className="flex-1 text-left">{item.label}</span>
                    </NavLink>
                    <button
                      type="button"
                      aria-label={dashOpen ? 'Collapse dashboards' : 'Expand dashboards'}
                      aria-expanded={dashOpen}
                      onClick={() => setDashOpen((v) => !v)}
                      className="rounded-lg p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <MaterialIcon
                        name="expand_more"
                        className={cn('text-[20px] transition', dashOpen && 'rotate-180')}
                      />
                    </button>
                  </div>
                  {dashOpen ? (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 pl-3">
                      {visibleDashboards.map((d) => (
                        <NavLink
                          key={d.to}
                          to={d.to}
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            cn(
                              'flex min-h-[40px] items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                              isActive
                                ? 'bg-primary/10 font-medium text-primary'
                                : 'text-slate-600 hover:bg-slate-50',
                            )
                          }
                        >
                          <MaterialIcon name={d.icon} className="text-[18px]" />
                          {d.label}
                        </NavLink>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={false}
                  onClick={onNavigate}
                  className={() => {
                    const active =
                      location.pathname === item.to ||
                      location.pathname.startsWith(`${item.to}/`)
                    return cn(
                      'flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-600 hover:bg-slate-50',
                    )
                  }}
                >
                  <MaterialIcon name={item.icon} className="text-[20px]" />
                  {item.label}
                </NavLink>
              ),
            )}
          </div>
        </div>
      ))}
    </nav>
  )
}

export function AppShell() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const initials =
    profile?.full_name
      ?.split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U'

  const roleLabel = profile?.role?.name ? getRoleLabel(profile.role.name) : 'User'

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen w-full bg-background">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform xl:w-72 lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white">
            <MaterialIcon name="inventory_2" className="text-[18px]" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Inventory System</p>
            <p className="text-xs text-slate-400">Internal</p>
          </div>
        </div>

        <SidebarNav onNavigate={() => setMobileOpen(false)} />

        <div className="border-t border-slate-200 p-3">
          <p className="px-3 pb-2 text-xs text-slate-400">Signed in as {profile?.full_name}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <MaterialIcon name="menu" />
          </button>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden h-6 w-px bg-slate-200 sm:block" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Open account menu"
                  className="group flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:gap-3 sm:px-2 sm:py-1.5"
                >
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-semibold leading-none text-slate-900">
                      {profile?.full_name}
                    </p>
                    <span className="mt-1 inline-flex rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                      {roleLabel}
                    </span>
                  </div>
                  <div className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white ring-2 ring-white group-hover:ring-primary/40">
                    {initials}
                  </div>
                  <MaterialIcon
                    name="expand_more"
                    className="hidden text-[20px] text-slate-400 group-hover:text-slate-600 sm:block"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-3">
                    <MaterialIcon name="person" className="text-[20px]" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:bg-red-50 focus:text-red-600"
                  onSelect={() => {
                    void handleSignOut()
                  }}
                >
                  <MaterialIcon name="logout" className="text-[20px]" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:gap-8 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

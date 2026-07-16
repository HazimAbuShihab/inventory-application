import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useAssetUtilizationReport,
  useDepartmentAssetsReport,
  useDisposableConsumptionReport,
  useDisposalHistoryReport,
  useEmployeeAssetsReport,
  useEmployeeCoverageReport,
  useMaintenanceCostsReport,
  useOverdueAssignmentsReport,
  usePurchaseHistoryReport,
  useWarrantyExpiringReport,
  type ActiveAssignment,
  type DepartmentAssetSummary,
  type DisposableConsumptionRecord,
  type DisposalRecord,
  type EmployeeCoverageRecord,
  type MaintenanceCostRecord,
  type MaintenanceCostSummary,
  type OverdueAssignmentRecord,
  type PurchaseRecord,
  type WarrantyExpiringRecord,
} from '@/hooks/useReports'
import { downloadCsv, formatCurrency, formatDate, labelize } from '@/lib/utils'

const REPORT_TABS = [
  { id: 'utilization', label: 'Utilization' },
  { id: 'coverage', label: 'Employee Coverage' },
  { id: 'warranty', label: 'Warranty Expiring' },
  { id: 'overdue', label: 'Overdue Assignments' },
  { id: 'employees', label: 'Employee Assets' },
  { id: 'departments', label: 'Department Assets' },
  { id: 'purchases', label: 'Purchase History' },
  { id: 'disposals', label: 'Disposal History' },
  { id: 'consumption', label: 'Disposable Consumption' },
  { id: 'maintenance', label: 'Maintenance Costs' },
] as const

type ReportTab = (typeof REPORT_TABS)[number]['id']

const WARRANTY_FILTERS = [
  { days: 30, label: '30 Days' },
  { days: 60, label: '60 Days' },
  { days: 90, label: '90 Days' },
] as const

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('utilization')
  const [warrantyDays, setWarrantyDays] = useState(30)

  const utilization = useAssetUtilizationReport()
  const employeeCoverage = useEmployeeCoverageReport()
  const warrantyExpiring = useWarrantyExpiringReport(warrantyDays)
  const overdueAssignments = useOverdueAssignmentsReport()
  const employeeAssets = useEmployeeAssetsReport()
  const departmentAssets = useDepartmentAssetsReport()
  const purchaseHistory = usePurchaseHistoryReport()
  const disposalHistory = useDisposalHistoryReport()
  const disposableConsumption = useDisposableConsumptionReport()
  const maintenanceCosts = useMaintenanceCostsReport()

  const activeQueries = [
    utilization,
    employeeCoverage,
    warrantyExpiring,
    overdueAssignments,
    employeeAssets,
    departmentAssets,
    purchaseHistory,
    disposalHistory,
    disposableConsumption,
    maintenanceCosts,
  ]

  const isLoading = activeQueries.some((query) => query.isLoading)

  const coverageSummary = useMemo(() => {
    const rows = employeeCoverage.data ?? []
    const withCoverage = rows.filter((row) => row.has_coverage).length
    const withoutCoverage = rows.length - withCoverage
    return { withCoverage, withoutCoverage, total: rows.length }
  }, [employeeCoverage.data])

  const employeeColumns: DataTableColumn<ActiveAssignment>[] = useMemo(
    () => [
      {
        key: 'employee',
        header: 'Employee',
        cell: (row) => (
          <div>
            <p className="font-medium">{row.employee?.user?.full_name ?? '—'}</p>
            <p className="text-xs text-muted-foreground">{row.employee?.user?.email ?? ''}</p>
          </div>
        ),
      },
      {
        key: 'department',
        header: 'Department',
        cell: (row) => row.employee?.department?.name ?? '—',
      },
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
        key: 'type',
        header: 'Type',
        cell: (row) => <Badge variant="outline">{labelize(row.asset?.asset_type ?? '')}</Badge>,
      },
      {
        key: 'status',
        header: 'Status',
        cell: (row) => <StatusBadge status={row.asset?.status ?? 'available'} />,
      },
      {
        key: 'assigned_date',
        header: 'Assigned',
        cell: (row) => formatDate(row.assigned_date),
      },
    ],
    [],
  )

  const coverageColumns: DataTableColumn<EmployeeCoverageRecord>[] = useMemo(
    () => [
      { key: 'employee_number', header: 'Employee #', cell: (row) => <span className="font-mono text-sm">{row.employee_number}</span> },
      { key: 'name', header: 'Name', cell: (row) => <span className="font-medium">{row.full_name}</span> },
      { key: 'email', header: 'Email', cell: (row) => row.email },
      { key: 'department', header: 'Department', cell: (row) => row.department_name },
      { key: 'assignments', header: 'Active Assignments', cell: (row) => row.active_assignments },
      {
        key: 'coverage',
        header: 'Coverage',
        cell: (row) => (
          <Badge variant={row.has_coverage ? 'default' : 'outline'}>
            {row.has_coverage ? 'Covered' : 'No Assets'}
          </Badge>
        ),
      },
    ],
    [],
  )

  const warrantyColumns: DataTableColumn<WarrantyExpiringRecord>[] = useMemo(
    () => [
      { key: 'asset', header: 'Asset', cell: (row) => <span className="font-medium">{row.name}</span> },
      { key: 'code', header: 'Code', cell: (row) => <span className="font-mono text-sm">{row.asset_code}</span> },
      { key: 'domain', header: 'Domain', cell: (row) => labelize(row.category?.domain ?? 'unassigned') },
      { key: 'category', header: 'Category', cell: (row) => row.category?.name ?? '—' },
      { key: 'expiry', header: 'Warranty Expiry', cell: (row) => formatDate(row.warranty_expiry) },
      { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
    ],
    [],
  )

  const overdueColumns: DataTableColumn<OverdueAssignmentRecord>[] = useMemo(
    () => [
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
      { key: 'department', header: 'Department', cell: (row) => row.employee?.department?.name ?? '—' },
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
      { key: 'expected', header: 'Expected Return', cell: (row) => formatDate(row.expected_return_date) },
      { key: 'assigned', header: 'Assigned', cell: (row) => formatDate(row.assigned_date) },
    ],
    [],
  )

  const departmentColumns: DataTableColumn<DepartmentAssetSummary>[] = useMemo(
    () => [
      { key: 'department', header: 'Department', cell: (row) => <span className="font-medium">{row.department_name}</span> },
      { key: 'assets', header: 'Active Assets', cell: (row) => row.asset_count },
      { key: 'employees', header: 'Employees with Assets', cell: (row) => row.employees_with_assets },
    ],
    [],
  )

  const purchaseColumns: DataTableColumn<PurchaseRecord>[] = useMemo(
    () => [
      { key: 'date', header: 'Date', cell: (row) => formatDate(row.date) },
      { key: 'asset', header: 'Asset', cell: (row) => row.asset_name },
      { key: 'code', header: 'Code', cell: (row) => <span className="font-mono text-sm">{row.asset_code}</span> },
      { key: 'qty', header: 'Qty', cell: (row) => row.quantity },
      { key: 'price', header: 'Price', cell: (row) => formatCurrency(row.price) },
      { key: 'source', header: 'Source', cell: (row) => <Badge variant="outline">{labelize(row.source)}</Badge> },
    ],
    [],
  )

  const disposalColumns: DataTableColumn<DisposalRecord>[] = useMemo(
    () => [
      { key: 'date', header: 'Date', cell: (row) => formatDate(row.created_at) },
      { key: 'asset', header: 'Asset', cell: (row) => row.asset?.name ?? '—' },
      { key: 'code', header: 'Code', cell: (row) => <span className="font-mono text-sm">{row.asset?.asset_code ?? '—'}</span> },
      { key: 'qty', header: 'Qty', cell: (row) => row.quantity },
      { key: 'performer', header: 'Performed By', cell: (row) => row.performer?.full_name ?? '—' },
      { key: 'notes', header: 'Notes', cell: (row) => <span className="text-muted-foreground">{row.notes ?? '—'}</span> },
    ],
    [],
  )

  const consumptionColumns: DataTableColumn<DisposableConsumptionRecord>[] = useMemo(
    () => [
      { key: 'date', header: 'Date', cell: (row) => formatDate(row.date) },
      { key: 'asset', header: 'Asset', cell: (row) => row.asset_name },
      { key: 'code', header: 'Code', cell: (row) => <span className="font-mono text-sm">{row.asset_code}</span> },
      { key: 'qty', header: 'Qty', cell: (row) => row.quantity },
      { key: 'recipient', header: 'Recipient', cell: (row) => row.recipient },
      { key: 'source', header: 'Source', cell: (row) => <Badge variant="outline">{labelize(row.source)}</Badge> },
      { key: 'notes', header: 'Notes', cell: (row) => <span className="text-muted-foreground">{row.notes ?? '—'}</span> },
    ],
    [],
  )

  const maintenanceSummaryColumns: DataTableColumn<MaintenanceCostSummary>[] = useMemo(
    () => [
      { key: 'asset', header: 'Asset', cell: (row) => row.asset_name },
      { key: 'code', header: 'Code', cell: (row) => <span className="font-mono text-sm">{row.asset_code}</span> },
      { key: 'records', header: 'Records', cell: (row) => row.record_count },
      { key: 'total', header: 'Total Cost', cell: (row) => formatCurrency(row.total_cost) },
    ],
    [],
  )

  const maintenanceRecordColumns: DataTableColumn<MaintenanceCostRecord>[] = useMemo(
    () => [
      { key: 'date', header: 'Date', cell: (row) => formatDate(row.maintenance_date ?? row.created_at) },
      { key: 'asset', header: 'Asset', cell: (row) => row.asset?.name ?? '—' },
      { key: 'issue', header: 'Issue', cell: (row) => <span className="max-w-xs truncate">{row.issue_description}</span> },
      { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} type="maintenance" /> },
      { key: 'cost', header: 'Cost', cell: (row) => formatCurrency(row.cost) },
    ],
    [],
  )

  function handleExport(filename: string, rows: Record<string, unknown>[]) {
    if (!rows.length) {
      toast.error('No data to export')
      return
    }
    downloadCsv(filename, rows)
    toast.success('Report exported')
  }

  if (isLoading) return <LoadingState message="Loading reports..." />

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Inventory analytics and data exports" />

      <div className="flex flex-wrap gap-2">
        {REPORT_TABS.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === 'utilization' && utilization.data ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>By Status</CardTitle>
                <CardDescription>Asset counts grouped by current status</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleExport(
                    'asset-utilization-by-status.csv',
                    utilization.data.byStatus.map((row) => ({ status: row.status, count: row.count })),
                  )
                }
              >
                <Download className="size-4" />
                CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {utilization.data.byStatus.map((row) => (
                  <div key={row.status} className="flex items-center justify-between">
                    <StatusBadge status={row.status} />
                    <span className="font-semibold tabular-nums">{row.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>By Type</CardTitle>
                <CardDescription>Permanent vs disposable asset counts</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleExport(
                    'asset-utilization-by-type.csv',
                    utilization.data.byType.map((row) => ({ asset_type: row.asset_type, count: row.count })),
                  )
                }
              >
                <Download className="size-4" />
                CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {utilization.data.byType.map((row) => (
                  <div key={row.asset_type} className="flex items-center justify-between">
                    <Badge variant="outline">{labelize(row.asset_type)}</Badge>
                    <span className="font-semibold tabular-nums">{row.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>By Domain</CardTitle>
                <CardDescription>Asset counts grouped by category domain</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleExport(
                    'asset-utilization-by-domain.csv',
                    utilization.data.byDomain.map((row) => ({ domain: row.domain, count: row.count })),
                  )
                }
              >
                <Download className="size-4" />
                CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {utilization.data.byDomain.map((row) => (
                  <div key={row.domain} className="flex items-center justify-between">
                    <Badge variant="outline">{labelize(row.domain)}</Badge>
                    <span className="font-semibold tabular-nums">{row.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === 'coverage' ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Total Active Employees</p>
                <p className="text-2xl font-semibold tabular-nums">{coverageSummary.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">With Active Assignments</p>
                <p className="text-2xl font-semibold tabular-nums text-success">{coverageSummary.withCoverage}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Without Assignments</p>
                <p className="text-2xl font-semibold tabular-nums text-warning">{coverageSummary.withoutCoverage}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleExport(
                  'employee-coverage.csv',
                  (employeeCoverage.data ?? []).map((row) => ({
                    employee_number: row.employee_number,
                    full_name: row.full_name,
                    email: row.email,
                    department: row.department_name,
                    active_assignments: row.active_assignments,
                    has_coverage: row.has_coverage ? 'yes' : 'no',
                  })),
                )
              }
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>

          <DataTable
            columns={coverageColumns}
            data={employeeCoverage.data ?? []}
            keyExtractor={(row) => row.employee_id}
            emptyTitle="No employee data"
            emptyDescription="Active employees will appear here for coverage analysis."
          />
        </div>
      ) : null}

      {activeTab === 'warranty' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {WARRANTY_FILTERS.map((filter) => (
                <Button
                  key={filter.days}
                  variant={warrantyDays === filter.days ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWarrantyDays(filter.days)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleExport(
                  `warranty-expiring-${warrantyDays}d.csv`,
                  (warrantyExpiring.data ?? []).map((row) => ({
                    asset_name: row.name,
                    asset_code: row.asset_code,
                    domain: row.category?.domain ?? '',
                    category: row.category?.name ?? '',
                    warranty_expiry: row.warranty_expiry ?? '',
                    status: row.status,
                  })),
                )
              }
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>

          <DataTable
            columns={warrantyColumns}
            data={warrantyExpiring.data ?? []}
            keyExtractor={(row) => row.id}
            emptyTitle="No expiring warranties"
            emptyDescription={`No assets have warranties expiring within ${warrantyDays} days.`}
          />
        </div>
      ) : null}

      {activeTab === 'overdue' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleExport(
                  'overdue-assignments.csv',
                  (overdueAssignments.data ?? []).map((row) => ({
                    employee: row.employee?.user?.full_name ?? '',
                    employee_number: row.employee?.employee_number ?? '',
                    department: row.employee?.department?.name ?? '',
                    asset_name: row.asset?.name ?? '',
                    asset_code: row.asset?.asset_code ?? '',
                    expected_return_date: row.expected_return_date ?? '',
                    assigned_date: row.assigned_date,
                  })),
                )
              }
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>
          <DataTable
            columns={overdueColumns}
            data={overdueAssignments.data ?? []}
            keyExtractor={(row) => row.id}
            emptyTitle="No overdue assignments"
            emptyDescription="Active assignments past their expected return date will appear here."
          />
        </div>
      ) : null}

      {activeTab === 'employees' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleExport(
                  'employee-assets.csv',
                  (employeeAssets.data ?? []).map((row) => ({
                    employee: row.employee?.user?.full_name ?? '',
                    email: row.employee?.user?.email ?? '',
                    department: row.employee?.department?.name ?? '',
                    asset: row.asset?.name ?? '',
                    asset_code: row.asset?.asset_code ?? '',
                    asset_type: row.asset?.asset_type ?? '',
                    status: row.asset?.status ?? '',
                    assigned_date: row.assigned_date,
                  })),
                )
              }
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>
          <DataTable
            columns={employeeColumns}
            data={employeeAssets.data ?? []}
            keyExtractor={(row) => row.id}
            emptyTitle="No active assignments"
            emptyDescription="Assigned assets will appear here when employees have active assignments."
          />
        </div>
      ) : null}

      {activeTab === 'departments' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleExport(
                  'department-assets.csv',
                  (departmentAssets.data ?? []).map((row) => ({
                    department: row.department_name,
                    asset_count: row.asset_count,
                    employees_with_assets: row.employees_with_assets,
                  })),
                )
              }
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>
          <DataTable
            columns={departmentColumns}
            data={departmentAssets.data ?? []}
            keyExtractor={(row) => row.department_id}
            emptyTitle="No department data"
            emptyDescription="Department asset summaries will appear when assignments exist."
          />
        </div>
      ) : null}

      {activeTab === 'purchases' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleExport(
                  'purchase-history.csv',
                  (purchaseHistory.data ?? []).map((row) => ({
                    date: row.date,
                    asset_name: row.asset_name,
                    asset_code: row.asset_code,
                    quantity: row.quantity,
                    price: row.price ?? '',
                    source: row.source,
                    notes: row.notes ?? '',
                  })),
                )
              }
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>
          <DataTable
            columns={purchaseColumns}
            data={purchaseHistory.data ?? []}
            keyExtractor={(row) => row.id}
            emptyTitle="No purchase records"
            emptyDescription="Purchase transactions and assets with purchase dates will appear here."
          />
        </div>
      ) : null}

      {activeTab === 'disposals' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleExport(
                  'disposal-history.csv',
                  (disposalHistory.data ?? []).map((row) => ({
                    date: row.created_at,
                    asset_name: row.asset?.name ?? '',
                    asset_code: row.asset?.asset_code ?? '',
                    quantity: row.quantity,
                    performed_by: row.performer?.full_name ?? '',
                    notes: row.notes ?? '',
                  })),
                )
              }
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>
          <DataTable
            columns={disposalColumns}
            data={disposalHistory.data ?? []}
            keyExtractor={(row) => row.id}
            emptyTitle="No disposal records"
            emptyDescription="Disposal transactions will appear here."
          />
        </div>
      ) : null}

      {activeTab === 'consumption' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleExport(
                  'disposable-consumption.csv',
                  (disposableConsumption.data ?? []).map((row) => ({
                    date: row.date,
                    asset_name: row.asset_name,
                    asset_code: row.asset_code,
                    quantity: row.quantity,
                    recipient: row.recipient,
                    source: row.source,
                    notes: row.notes ?? '',
                  })),
                )
              }
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>
          <DataTable
            columns={consumptionColumns}
            data={disposableConsumption.data ?? []}
            keyExtractor={(row) => row.id}
            emptyTitle="No consumption records"
            emptyDescription="Disposable distributions or stock-out transactions will appear here."
          />
        </div>
      ) : null}

      {activeTab === 'maintenance' && maintenanceCosts.data ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Cost Summary by Asset</CardTitle>
                <CardDescription>Total maintenance spend grouped by asset</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleExport(
                    'maintenance-cost-summary.csv',
                    maintenanceCosts.data.summary.map((row) => ({
                      asset_name: row.asset_name,
                      asset_code: row.asset_code,
                      record_count: row.record_count,
                      total_cost: row.total_cost,
                    })),
                  )
                }
              >
                <Download className="size-4" />
                CSV
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={maintenanceSummaryColumns}
                data={maintenanceCosts.data.summary}
                keyExtractor={(row) => row.asset_id}
                emptyTitle="No maintenance costs"
                emptyDescription="Maintenance records with costs will appear here."
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">All Maintenance Records</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleExport(
                    'maintenance-records.csv',
                    maintenanceCosts.data.records.map((row) => ({
                      date: row.maintenance_date ?? row.created_at,
                      asset_name: row.asset?.name ?? '',
                      asset_code: row.asset?.asset_code ?? '',
                      issue: row.issue_description,
                      status: row.status,
                      cost: row.cost ?? '',
                    })),
                  )
                }
              >
                <Download className="size-4" />
                Export CSV
              </Button>
            </div>
            <DataTable
              columns={maintenanceRecordColumns}
              data={maintenanceCosts.data.records}
              keyExtractor={(row) => row.id}
              emptyTitle="No maintenance records"
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

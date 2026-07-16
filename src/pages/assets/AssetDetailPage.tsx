import {
  AlertTriangle,
  ArrowLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  Pencil,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'

import { AssetTimeline } from '@/components/assets/AssetTimeline'
import { MaterialIcon } from '@/components/common/MaterialIcon'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { LoadingState } from '@/components/common/LoadingState'
import { StatusBadge } from '@/components/common/StatusBadge'
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
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import {
  useAsset,
  useReportAssetIssue,
  useStockTransaction,
} from '@/hooks/useAssets'
import { formatCurrency, formatDate, labelize } from '@/lib/utils'
import type { Tables } from '@/types/database'

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { isAdmin, profile } = useAuth()
  const { data: asset, isLoading, error } = useAsset(id)
  const reportMutation = useReportAssetIssue()
  const stockMutation = useStockTransaction()

  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportStatus, setReportStatus] = useState<'damaged' | 'lost'>('damaged')
  const [reportDescription, setReportDescription] = useState('')
  const [createMaintenance, setCreateMaintenance] = useState(true)

  const [stockType, setStockType] = useState<'stock_in' | 'stock_out'>('stock_in')
  const [stockQuantity, setStockQuantity] = useState('1')
  const [stockNotes, setStockNotes] = useState('')

  const currentAssignment =
    asset?.assignments.find((a) => a.is_active ?? !a.returned_date) ?? null
  const recentTransactions = asset?.transactions.slice(0, 10) ?? []
  const isLowStock =
    asset?.asset_type === 'disposable' && asset.quantity <= asset.minimum_stock_level

  async function handleReport() {
    if (!asset || !id) return
    if (!reportDescription.trim()) {
      toast.error('Please describe the issue')
      return
    }

    try {
      await reportMutation.mutateAsync({
        assetId: id,
        status: reportStatus,
        issueDescription: reportDescription.trim(),
        reportedBy: profile?.id ?? '',
        createMaintenance,
      })
      toast.success(`Asset reported as ${reportStatus}`)
      setReportDialogOpen(false)
      setReportDescription('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to report issue')
    }
  }

  async function handleStockTransaction(e: React.FormEvent) {
    e.preventDefault()
    if (!asset || !id) return

    const quantity = parseInt(stockQuantity, 10)
    if (!quantity || quantity <= 0) {
      toast.error('Enter a valid quantity')
      return
    }

    try {
      await stockMutation.mutateAsync({
        assetId: id,
        transactionType: stockType,
        quantity,
        notes: stockNotes.trim() || undefined,
        performedBy: profile?.id ?? '',
        currentQuantity: asset.quantity,
      })
      toast.success(stockType === 'stock_in' ? 'Stock added' : 'Stock removed')
      setStockQuantity('1')
      setStockNotes('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Stock transaction failed')
    }
  }

  const transactionColumns: DataTableColumn<Tables<'asset_transactions'>>[] = [
    {
      key: 'transaction_type',
      header: 'Type',
      cell: (row) => <Badge variant="outline">{labelize(row.transaction_type)}</Badge>,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      cell: (row) => row.quantity,
    },
    {
      key: 'notes',
      header: 'Notes',
      cell: (row) => row.notes ?? '—',
    },
    {
      key: 'created_at',
      header: 'Date',
      cell: (row) => formatDate(row.created_at),
    },
  ]

  if (isLoading) return <LoadingState message="Loading asset details..." />
  if (error || !asset) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/assets">
            <ArrowLeft className="size-4" />
            Back to Assets
          </Link>
        </Button>
        <p className="text-sm text-destructive">
          {error ? error.message : 'Asset not found'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/assets">
              <ArrowLeft className="size-4" />
              Back to Assets
            </Link>
          </Button>
          <div className="flex flex-wrap gap-2">
            {!isAdmin ? (
              <Button variant="outline" onClick={() => setReportDialogOpen(true)}>
                Report Damaged / Lost
              </Button>
            ) : null}
            {isAdmin ? (
              <Button asChild>
                <Link to={`/assets/${asset.id}/edit`}>
                  <Pencil className="size-4" />
                  Edit
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Inventory / {asset.category?.name ?? 'Assets'} / {asset.asset_code}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {asset.manufacturer ? `${asset.manufacturer} ${asset.model ?? asset.name}` : asset.name}
          </h1>
          <StatusBadge status={asset.status} type="asset" />
          {isLowStock ? (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="size-3" />
              Low Stock
            </Badge>
          ) : null}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm text-slate-500">
          <span>ID: {asset.asset_code}</span>
          {asset.barcode ? <span>Barcode: {asset.barcode}</span> : null}
          {asset.serial_number ? <span>Serial: {asset.serial_number}</span> : null}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Asset Overview</CardTitle>
              <CardDescription>Complete details for this inventory item</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 flex gap-4">
                <div className="flex h-[120px] w-[120px] shrink-0 items-center justify-center rounded-xl bg-slate-100 text-primary">
                  <MaterialIcon
                    name={asset.asset_type === 'disposable' ? 'deployed_code' : 'devices'}
                    className="text-[48px]"
                  />
                </div>
                <dl className="grid flex-1 gap-3 sm:grid-cols-2">
                  <DetailItem label="Status">
                    <StatusBadge status={asset.status} type="asset" />
                  </DetailItem>
                  <DetailItem label="Condition">
                    <StatusBadge status={asset.condition || 'good'} type="condition" />
                  </DetailItem>
                  <DetailItem label="Category">{asset.category?.name ?? '—'}</DetailItem>
                  <DetailItem label="Type">
                    <Badge variant="outline">{labelize(asset.asset_type)}</Badge>
                  </DetailItem>
                </dl>
              </div>
              <dl className="grid gap-4 sm:grid-cols-2">
                <DetailItem label="Serial Number">{asset.serial_number ?? '—'}</DetailItem>
                <DetailItem label="Barcode">{asset.barcode ?? '—'}</DetailItem>
                <DetailItem label="Manufacturer">{asset.manufacturer ?? '—'}</DetailItem>
                <DetailItem label="Model">{asset.model ?? '—'}</DetailItem>
                <DetailItem label="OS">{asset.operating_system ?? '—'}</DetailItem>
                <DetailItem label="Purpose">{asset.purpose ?? '—'}</DetailItem>
                <DetailItem label="Location">{asset.location ?? '—'}</DetailItem>
                <DetailItem label="Quantity">
                  {asset.asset_type === 'disposable' ? asset.quantity : '1 (permanent)'}
                </DetailItem>
                {asset.asset_type === 'disposable' ? (
                  <DetailItem label="Minimum Stock">{asset.minimum_stock_level}</DetailItem>
                ) : null}
                <DetailItem label="Purchase Date">{formatDate(asset.purchase_date)}</DetailItem>
                <DetailItem label="Purchase Price">{formatCurrency(asset.purchase_price)}</DetailItem>
                <DetailItem label="Useful Life">
                  {asset.useful_life_years ? `${asset.useful_life_years} years` : '—'}
                </DetailItem>
                <DetailItem label="Salvage Value">{formatCurrency(asset.salvage_value)}</DetailItem>
                <DetailItem label="Warranty Expiry">{formatDate(asset.warranty_expiry)}</DetailItem>
                <DetailItem label="Supplier">{asset.supplier ?? '—'}</DetailItem>
              </dl>
              {asset.description ? (
                <div className="mt-6">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Description</p>
                  <p className="mt-1 text-sm text-slate-700">{asset.description}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Current Holder</CardTitle>
              {currentAssignment ? (
                <span className="text-xs text-slate-500">
                  Assigned {formatDate(currentAssignment.assigned_date)}
                </span>
              ) : null}
            </CardHeader>
            <CardContent>
              {currentAssignment ? (
                <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
                  <div className="relative">
                    <div className="flex size-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-white shadow-md">
                      {(currentAssignment.employee as { user?: { full_name?: string } } | null)?.user
                        ?.full_name?.[0] ?? 'E'}
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-green-500 text-white ring-2 ring-white">
                      <MaterialIcon name="check" className="text-[12px]" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold text-slate-900">
                      {(currentAssignment.employee as { user?: { full_name?: string } } | null)?.user
                        ?.full_name ?? 'Employee'}
                    </p>
                    <p className="text-sm text-slate-500">Current Asset Holder</p>
                    <div className="mt-2 flex flex-col gap-1 text-sm text-slate-600">
                      {currentAssignment.location ? (
                        <div className="flex items-center gap-1.5">
                          <MaterialIcon name="location_on" className="text-[18px] text-slate-400" />
                          <span>
                            {[
                              currentAssignment.location.building,
                              currentAssignment.location.floor != null
                                ? `Floor ${currentAssignment.location.floor}`
                                : null,
                              currentAssignment.location.room,
                            ]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </div>
                      ) : null}
                      <div className="flex items-center gap-1.5">
                        <MaterialIcon name="calendar_today" className="text-[18px] text-slate-400" />
                        <span>Assigned {formatDate(currentAssignment.assigned_date)}</span>
                      </div>
                      {currentAssignment.notes ? (
                        <p className="mt-1 text-slate-600">{currentAssignment.notes}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <MaterialIcon name="person_off" className="text-[48px] text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">No current holder</p>
                  <p className="text-xs text-slate-400">This asset is available for assignment</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>QR Code</CardTitle>
              <CardDescription>Scan to identify this asset</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="rounded-lg border border-border bg-white p-4">
                <QRCodeSVG value={asset.asset_code} size={160} level="M" />
              </div>
              <p className="font-mono text-sm text-muted-foreground">{asset.asset_code}</p>
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <AssetTimeline assetId={asset.id} />
        </div>
      </div>

      {asset.asset_type === 'disposable' && isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Stock Management</CardTitle>
            <CardDescription>Record stock in or stock out transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStockTransaction} className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <Select
                  value={stockType}
                  onValueChange={(v) => setStockType(v as 'stock_in' | 'stock_out')}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock_in">
                      <span className="flex items-center gap-2">
                        <ArrowDownCircle className="size-4" />
                        Stock In
                      </span>
                    </SelectItem>
                    <SelectItem value="stock_out">
                      <span className="flex items-center gap-2">
                        <ArrowUpCircle className="size-4" />
                        Stock Out
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock-qty">Quantity</Label>
                <Input
                  id="stock-qty"
                  type="number"
                  min="1"
                  className="w-[120px]"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="stock-notes">Notes</Label>
                <Input
                  id="stock-notes"
                  value={stockNotes}
                  onChange={(e) => setStockNotes(e.target.value)}
                  placeholder="Optional notes"
                />
              </div>
              <Button type="submit" disabled={stockMutation.isPending}>
                Record Transaction
              </Button>
            </form>
            <p className="mt-3 text-sm text-muted-foreground">
              Current stock: <span className="font-medium text-foreground">{asset.quantity}</span>
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Recent Transactions</h2>
        <DataTable
          columns={transactionColumns}
          data={recentTransactions}
          keyExtractor={(row) => row.id}
          emptyTitle="No transactions yet"
          emptyDescription="Stock movements and other transactions will appear here."
        />
      </div>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Asset Issue</DialogTitle>
            <DialogDescription>
              Report this asset as damaged or lost. A maintenance record can be created automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Issue Type</Label>
              <Select
                value={reportStatus}
                onValueChange={(v) => setReportStatus(v as 'damaged' | 'lost')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue-desc">Description *</Label>
              <Textarea
                id="issue-desc"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Describe what happened..."
                rows={4}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={createMaintenance}
                onChange={(e) => setCreateMaintenance(e.target.checked)}
                className="size-4 rounded border-border"
              />
              Create maintenance record
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReport} disabled={reportMutation.isPending}>
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  )
}

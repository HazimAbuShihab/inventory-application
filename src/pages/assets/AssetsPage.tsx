import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { LoadingState } from '@/components/common/LoadingState'
import { MaterialIcon } from '@/components/common/MaterialIcon'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { useAssets, useDeleteAsset, type AssetWithCategory } from '@/hooks/useAssets'
import { useCategories } from '@/hooks/useCategories'
import { ASSET_STATUSES, ASSET_TYPES, downloadCsv, formatCurrency, labelize } from '@/lib/utils'
import type { AssetStatus, AssetType } from '@/types/database'

export default function AssetsPage() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { data: categories = [] } = useCategories()

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [assetType, setAssetType] = useState<AssetType | 'all'>('all')
  const [status, setStatus] = useState<AssetStatus | 'all'>('all')
  const [deleteTarget, setDeleteTarget] = useState<AssetWithCategory | null>(null)

  const filters = useMemo(
    () => ({ search, categoryId, assetType, status }),
    [search, categoryId, assetType, status],
  )

  const { data: assets = [], isLoading, error } = useAssets(filters)
  const deleteMutation = useDeleteAsset()

  function isLowStock(asset: AssetWithCategory) {
    return asset.asset_type === 'disposable' && asset.quantity <= asset.minimum_stock_level
  }

  function handleExport() {
    if (!assets.length) {
      toast.error('No assets to export')
      return
    }

    downloadCsv(
      `assets-${new Date().toISOString().slice(0, 10)}.csv`,
      assets.map((asset) => ({
        asset_code: asset.asset_code,
        name: asset.name,
        category: asset.category?.name ?? '',
        asset_type: asset.asset_type,
        status: asset.status,
        serial_number: asset.serial_number ?? '',
        quantity: asset.quantity,
        minimum_stock_level: asset.minimum_stock_level,
        location: asset.location ?? '',
        purchase_price: asset.purchase_price ?? '',
      })),
    )
    toast.success('Assets exported to CSV')
  }

  async function handleDelete() {
    if (!deleteTarget) return

    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success('Asset deleted')
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete asset')
    }
  }

  const columns: DataTableColumn<AssetWithCategory>[] = [
    {
      key: 'asset_code',
      header: 'Code',
      cell: (row) => <span className="font-mono text-sm">{row.asset_code}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-primary">
            <MaterialIcon
              name={row.asset_type === 'disposable' ? 'deployed_code' : 'devices'}
              className="text-[18px]"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{row.name}</p>
            {isLowStock(row) ? (
              <Badge variant="destructive" className="mt-0.5 gap-1">
                <MaterialIcon name="warning" className="text-[14px]" />
                Low Stock
              </Badge>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (row) => row.category?.name ?? '—',
    },
    {
      key: 'asset_type',
      header: 'Type',
      cell: (row) => <Badge variant="outline">{labelize(row.asset_type)}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} type="asset" />,
    },
    {
      key: 'serial_number',
      header: 'Serial',
      cell: (row) => row.serial_number ?? '—',
    },
    {
      key: 'quantity',
      header: 'Qty',
      cell: (row) => (row.asset_type === 'disposable' ? row.quantity : '1'),
    },
    {
      key: 'location',
      header: 'Location',
      cell: (row) => row.location ?? '—',
    },
    {
      key: 'purchase_price',
      header: 'Price',
      cell: (row) => formatCurrency(row.purchase_price),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-[130px]',
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" asChild aria-label="View asset">
            <Link to={`/assets/${row.id}`}>
              <MaterialIcon name="visibility" className="text-[20px]" />
            </Link>
          </Button>
          {isAdmin ? (
            <>
              <Button variant="ghost" size="icon" asChild aria-label="Edit asset">
                <Link to={`/assets/${row.id}/edit`}>
                  <MaterialIcon name="edit" className="text-[20px]" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteTarget(row)}
                aria-label="Delete asset"
              >
                <MaterialIcon name="delete" className="text-[20px] text-destructive" />
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ]

  if (isLoading) return <LoadingState message="Loading assets..." />
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Assets"
          description="Manage permanent and disposable inventory assets"
          icon="inventory_2"
        />
        <p className="text-sm text-destructive">Failed to load assets: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        description="Manage permanent and disposable inventory assets"
        icon="inventory_2"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExport}>
              <MaterialIcon name="download" className="text-[18px]" />
              Export CSV
            </Button>
            {isAdmin ? (
              <Button asChild>
                <Link to="/assets/new">
                  <MaterialIcon name="add" className="text-[18px]" />
                  New Asset
                </Link>
              </Button>
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
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-50 pl-10"
          />
        </div>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType | 'all')}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ASSET_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {labelize(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as AssetStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ASSET_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {labelize(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden">
        <DataTable
          columns={columns}
          data={assets}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/assets/${row.id}`)}
          emptyTitle="No assets found"
          emptyDescription="Try adjusting filters or create a new asset."
          emptyIcon="inventory_2"
          emptyAction={
            isAdmin ? (
              <Button asChild>
                <Link to="/assets/new">
                  <MaterialIcon name="add" className="text-[18px]" />
                  New Asset
                </Link>
              </Button>
            ) : undefined
          }
        />
      </div>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete asset</DialogTitle>
            <DialogDescription>
              Delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.asset_code})? This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

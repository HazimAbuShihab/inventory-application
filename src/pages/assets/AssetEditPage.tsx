import { ArrowLeft } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import {
  AssetForm,
  assetFormValuesToPayload,
  assetToFormValues,
  type AssetFormValues,
} from '@/components/assets/AssetForm'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { useAsset, useUpdateAsset } from '@/hooks/useAssets'
import { useCategories } from '@/hooks/useCategories'

export default function AssetEditPage() {
  const { id } = useParams<{ id: string }>()
  const { isAdmin } = useAuth()
  const { data: asset, isLoading: assetLoading, error } = useAsset(id)
  const { data: categories = [], isLoading: categoriesLoading } = useCategories()
  const updateMutation = useUpdateAsset()

  if (!isAdmin) {
    return <Navigate to="/assets" replace />
  }

  async function handleSubmit(values: AssetFormValues) {
    if (!id) return

    try {
      await updateMutation.mutateAsync({
        id,
        ...assetFormValuesToPayload(values),
      })
      toast.success('Asset updated successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update asset')
    }
  }

  if (assetLoading || categoriesLoading) {
    return <LoadingState message="Loading asset..." />
  }

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
      <Button variant="ghost" size="sm" asChild>
        <Link to={`/assets/${id}`}>
          <ArrowLeft className="size-4" />
          Back to Asset
        </Link>
      </Button>

      <PageHeader
        title="Edit Asset"
        description={`${asset.name} (${asset.asset_code})`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Asset Details</CardTitle>
          <CardDescription>Update the asset information</CardDescription>
        </CardHeader>
        <CardContent>
          <AssetForm
            categories={categories}
            defaultValues={assetToFormValues(asset)}
            onSubmit={handleSubmit}
            submitLabel="Save Changes"
            isSubmitting={updateMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}

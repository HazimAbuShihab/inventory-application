import { ArrowLeft } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import {
  AssetForm,
  assetFormValuesToPayload,
  type AssetFormValues,
} from '@/components/assets/AssetForm'
import { LoadingState } from '@/components/common/LoadingState'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { useCreateAsset } from '@/hooks/useAssets'
import { useCategories } from '@/hooks/useCategories'

export default function AssetNewPage() {
  const navigate = useNavigate()
  const { isAdmin, profile } = useAuth()
  const { data: categories = [], isLoading } = useCategories()
  const createMutation = useCreateAsset()

  if (!isAdmin) {
    return <Navigate to="/assets" replace />
  }

  async function handleSubmit(values: AssetFormValues) {
    try {
      const asset = await createMutation.mutateAsync(
        assetFormValuesToPayload(values, profile?.id),
      )
      toast.success('Asset created successfully')
      navigate(`/assets/${asset.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create asset')
    }
  }

  if (isLoading) return <LoadingState message="Loading form..." />

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/assets">
          <ArrowLeft className="size-4" />
          Back to Assets
        </Link>
      </Button>

      <PageHeader
        title="New Asset"
        description="Register a new inventory asset"
      />

      <Card>
        <CardHeader>
          <CardTitle>Asset Details</CardTitle>
          <CardDescription>Fill in the information for the new asset</CardDescription>
        </CardHeader>
        <CardContent>
          <AssetForm
            categories={categories}
            onSubmit={handleSubmit}
            submitLabel="Create Asset"
            isSubmitting={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}

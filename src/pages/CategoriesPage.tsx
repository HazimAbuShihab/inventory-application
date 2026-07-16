import { Ban, CheckCircle, Pencil, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
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
import { Textarea } from '@/components/ui/textarea'
import {
  useActivateCategory,
  useActivateSubcategory,
  useCategories,
  useCreateCategory,
  useCreateSubcategory,
  useDeactivateCategory,
  useDeactivateSubcategory,
  useSubcategories,
  useUpdateCategory,
  useUpdateSubcategory,
} from '@/hooks/useCategories'
import { ASSET_TYPES, CATEGORY_DOMAINS, formatDate, labelize } from '@/lib/utils'
import type { AssetType, CategoryDomain, Tables } from '@/types/database'

type CategoryFormState = {
  name: string
  description: string
  asset_type: AssetType
  domain: CategoryDomain
}

type SubcategoryFormState = {
  name: string
  description: string
}

const emptyCategoryForm: CategoryFormState = {
  name: '',
  description: '',
  asset_type: 'permanent',
  domain: 'it',
}

const emptySubcategoryForm: SubcategoryFormState = { name: '', description: '' }

export default function CategoriesPage() {
  const { data: categories = [], isLoading, error } = useCategories()
  const { data: subcategories = [] } = useSubcategories()
  const createCategoryMutation = useCreateCategory()
  const updateCategoryMutation = useUpdateCategory()
  const deactivateCategoryMutation = useDeactivateCategory()
  const activateCategoryMutation = useActivateCategory()
  const createSubcategoryMutation = useCreateSubcategory()
  const updateSubcategoryMutation = useUpdateSubcategory()
  const deactivateSubcategoryMutation = useDeactivateSubcategory()
  const activateSubcategoryMutation = useActivateSubcategory()

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Tables<'asset_categories'> | null>(null)
  const [editingSubcategory, setEditingSubcategory] = useState<Tables<'asset_subcategories'> | null>(null)
  const [parentCategory, setParentCategory] = useState<Tables<'asset_categories'> | null>(null)
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm)
  const [subcategoryForm, setSubcategoryForm] = useState<SubcategoryFormState>(emptySubcategoryForm)
  const [toggleCategoryTarget, setToggleCategoryTarget] = useState<Tables<'asset_categories'> | null>(null)
  const [toggleSubcategoryTarget, setToggleSubcategoryTarget] = useState<Tables<'asset_subcategories'> | null>(null)

  const subcategoriesByCategory = useMemo(() => {
    const map = new Map<string, Tables<'asset_subcategories'>[]>()
    for (const sub of subcategories) {
      const list = map.get(sub.category_id) ?? []
      list.push(sub)
      map.set(sub.category_id, list)
    }
    return map
  }, [subcategories])

  function openCreateCategory() {
    setEditingCategory(null)
    setCategoryForm(emptyCategoryForm)
    setCategoryDialogOpen(true)
  }

  function openEditCategory(category: Tables<'asset_categories'>) {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      description: category.description ?? '',
      asset_type: category.asset_type as AssetType,
      domain: category.domain as CategoryDomain,
    })
    setCategoryDialogOpen(true)
  }

  function openCreateSubcategory(category: Tables<'asset_categories'>) {
    setEditingSubcategory(null)
    setParentCategory(category)
    setSubcategoryForm(emptySubcategoryForm)
    setSubcategoryDialogOpen(true)
  }

  function openEditSubcategory(subcategory: Tables<'asset_subcategories'>, category: Tables<'asset_categories'>) {
    setEditingSubcategory(subcategory)
    setParentCategory(category)
    setSubcategoryForm({
      name: subcategory.name,
      description: subcategory.description ?? '',
    })
    setSubcategoryDialogOpen(true)
  }

  async function handleCategorySubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required')
      return
    }

    try {
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({
          id: editingCategory.id,
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || null,
          asset_type: categoryForm.asset_type,
          domain: categoryForm.domain,
        })
        toast.success('Category updated')
      } else {
        await createCategoryMutation.mutateAsync({
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || null,
          asset_type: categoryForm.asset_type,
          domain: categoryForm.domain,
        })
        toast.success('Category created')
      }
      setCategoryDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save category')
    }
  }

  async function handleSubcategorySubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subcategoryForm.name.trim()) {
      toast.error('Subcategory name is required')
      return
    }
    if (!parentCategory) return

    try {
      if (editingSubcategory) {
        await updateSubcategoryMutation.mutateAsync({
          id: editingSubcategory.id,
          name: subcategoryForm.name.trim(),
          description: subcategoryForm.description.trim() || null,
        })
        toast.success('Subcategory updated')
      } else {
        await createSubcategoryMutation.mutateAsync({
          category_id: parentCategory.id,
          name: subcategoryForm.name.trim(),
          description: subcategoryForm.description.trim() || null,
        })
        toast.success('Subcategory created')
      }
      setSubcategoryDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save subcategory')
    }
  }

  async function handleToggleCategory() {
    if (!toggleCategoryTarget) return

    try {
      if (toggleCategoryTarget.is_active) {
        await deactivateCategoryMutation.mutateAsync(toggleCategoryTarget.id)
        toast.success('Category deactivated')
      } else {
        await activateCategoryMutation.mutateAsync(toggleCategoryTarget.id)
        toast.success('Category activated')
      }
      setToggleCategoryTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update category status')
    }
  }

  async function handleToggleSubcategory() {
    if (!toggleSubcategoryTarget) return

    try {
      if (toggleSubcategoryTarget.is_active) {
        await deactivateSubcategoryMutation.mutateAsync(toggleSubcategoryTarget.id)
        toast.success('Subcategory deactivated')
      } else {
        await activateSubcategoryMutation.mutateAsync(toggleSubcategoryTarget.id)
        toast.success('Subcategory activated')
      }
      setToggleSubcategoryTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update subcategory status')
    }
  }

  if (isLoading) return <LoadingState message="Loading categories..." />
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Categories" description="Manage asset categories and subcategories" />
        <p className="text-sm text-destructive">Failed to load categories: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Manage asset categories and subcategories"
        actions={
          <Button onClick={openCreateCategory}>
            <Plus className="size-4" />
            Add Category
          </Button>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Create categories to classify your inventory assets."
          action={
            <Button onClick={openCreateCategory}>
              <Plus className="size-4" />
              Add Category
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {categories.map((category) => {
            const categorySubs = subcategoriesByCategory.get(category.id) ?? []

            return (
              <div key={category.id} className="rounded-lg border border-border bg-card">
                <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{category.name}</h3>
                      <Badge variant="outline">{labelize(category.domain)}</Badge>
                      <Badge variant="outline">{labelize(category.asset_type)}</Badge>
                      <Badge variant={category.is_active ? 'success' : 'secondary'}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {category.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">Created {formatDate(category.created_at)}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCreateSubcategory(category)}
                    >
                      <Plus className="size-4" />
                      Subcategory
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditCategory(category)} aria-label="Edit category">
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setToggleCategoryTarget(category)}
                      aria-label={category.is_active ? 'Deactivate category' : 'Activate category'}
                    >
                      {category.is_active ? (
                        <Ban className="size-4 text-destructive" />
                      ) : (
                        <CheckCircle className="size-4 text-success" />
                      )}
                    </Button>
                  </div>
                </div>

                {categorySubs.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {categorySubs.map((sub) => (
                      <li key={sub.id} className="flex items-center gap-3 px-4 py-3 pl-8">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{sub.name}</span>
                            <Badge variant={sub.is_active ? 'success' : 'secondary'} className="text-xs">
                              {sub.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          {sub.description && (
                            <p className="text-sm text-muted-foreground">{sub.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditSubcategory(sub, category)}
                            aria-label="Edit subcategory"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setToggleSubcategoryTarget(sub)}
                            aria-label={sub.is_active ? 'Deactivate subcategory' : 'Activate subcategory'}
                          >
                            {sub.is_active ? (
                              <Ban className="size-3.5 text-destructive" />
                            ) : (
                              <CheckCircle className="size-3.5 text-success" />
                            )}
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-3 pl-8 text-sm text-muted-foreground">No subcategories yet.</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'New Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update category details.' : 'Add a new asset category.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name *</Label>
              <Input
                id="cat-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Laptops"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-description">Description</Label>
              <Textarea
                id="cat-description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Domain *</Label>
                <Select
                  value={categoryForm.domain}
                  onValueChange={(value) =>
                    setCategoryForm((prev) => ({ ...prev, domain: value as CategoryDomain }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_DOMAINS.map((domain) => (
                      <SelectItem key={domain} value={domain}>
                        {labelize(domain)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Asset Type *</Label>
                <Select
                  value={categoryForm.asset_type}
                  onValueChange={(value) =>
                    setCategoryForm((prev) => ({ ...prev, asset_type: value as AssetType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {labelize(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
              >
                {editingCategory ? 'Save Changes' : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={subcategoryDialogOpen} onOpenChange={setSubcategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubcategory ? 'Edit Subcategory' : 'New Subcategory'}</DialogTitle>
            <DialogDescription>
              {editingSubcategory
                ? `Update subcategory under "${parentCategory?.name}".`
                : `Add a subcategory under "${parentCategory?.name}".`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubcategorySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sub-name">Name *</Label>
              <Input
                id="sub-name"
                value={subcategoryForm.name}
                onChange={(e) => setSubcategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Ultrabooks"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-description">Description</Label>
              <Textarea
                id="sub-description"
                value={subcategoryForm.description}
                onChange={(e) => setSubcategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSubcategoryDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createSubcategoryMutation.isPending || updateSubcategoryMutation.isPending}
              >
                {editingSubcategory ? 'Save Changes' : 'Create Subcategory'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(toggleCategoryTarget)} onOpenChange={(open) => !open && setToggleCategoryTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {toggleCategoryTarget?.is_active ? 'Deactivate Category' : 'Activate Category'}
            </DialogTitle>
            <DialogDescription>
              {toggleCategoryTarget?.is_active
                ? `Deactivate "${toggleCategoryTarget?.name}"? Assets using this category remain unchanged.`
                : `Reactivate "${toggleCategoryTarget?.name}"?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleCategoryTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={toggleCategoryTarget?.is_active ? 'destructive' : 'default'}
              onClick={handleToggleCategory}
              disabled={deactivateCategoryMutation.isPending || activateCategoryMutation.isPending}
            >
              {toggleCategoryTarget?.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(toggleSubcategoryTarget)} onOpenChange={(open) => !open && setToggleSubcategoryTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {toggleSubcategoryTarget?.is_active ? 'Deactivate Subcategory' : 'Activate Subcategory'}
            </DialogTitle>
            <DialogDescription>
              {toggleSubcategoryTarget?.is_active
                ? `Deactivate "${toggleSubcategoryTarget?.name}"?`
                : `Reactivate "${toggleSubcategoryTarget?.name}"?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleSubcategoryTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={toggleSubcategoryTarget?.is_active ? 'destructive' : 'default'}
              onClick={handleToggleSubcategory}
              disabled={deactivateSubcategoryMutation.isPending || activateSubcategoryMutation.isPending}
            >
              {toggleSubcategoryTarget?.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

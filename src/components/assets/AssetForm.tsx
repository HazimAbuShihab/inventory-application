import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
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
import { ASSET_CONDITIONS, ASSET_STATUSES, ASSET_TYPES, labelize } from '@/lib/utils'
import type { Tables } from '@/types/database'

const assetFormSchema = z
  .object({
    asset_code: z.string().min(1, 'Asset code is required'),
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    category_id: z.string().optional(),
    asset_type: z.enum(ASSET_TYPES),
    serial_number: z.string().optional(),
    barcode: z.string().optional(),
    manufacturer: z.string().optional(),
    model: z.string().optional(),
    operating_system: z.string().optional(),
    purpose: z.string().optional(),
    purchase_date: z.string().optional(),
    purchase_price: z.union([z.coerce.number<number>().min(0), z.literal('')]).optional(),
    useful_life_years: z.union([z.coerce.number<number>().min(1).max(100), z.literal('')]).optional(),
    salvage_value: z.union([z.coerce.number<number>().min(0), z.literal('')]).optional(),
    warranty_expiry: z.string().optional(),
    supplier: z.string().optional(),
    status: z.enum(ASSET_STATUSES),
    condition: z.enum(ASSET_CONDITIONS),
    location: z.string().optional(),
    quantity: z.coerce.number<number>().min(0, 'Quantity must be 0 or greater'),
    minimum_stock_level: z.coerce.number<number>().min(0, 'Minimum stock must be 0 or greater'),
  })
  .refine((data) => data.asset_type !== 'permanent' || data.quantity === 1, {
    message: 'Permanent assets must have a quantity of 1',
    path: ['quantity'],
  })

export type AssetFormValues = z.infer<typeof assetFormSchema>

interface AssetFormProps {
  categories: Tables<'asset_categories'>[]
  defaultValues?: Partial<AssetFormValues>
  onSubmit: (values: AssetFormValues) => Promise<void>
  submitLabel: string
  isSubmitting?: boolean
}

const emptyDefaults: AssetFormValues = {
  asset_code: '',
  name: '',
  description: '',
  category_id: '',
  asset_type: 'permanent',
  serial_number: '',
  barcode: '',
  manufacturer: '',
  model: '',
  operating_system: '',
  purpose: '',
  purchase_date: '',
  purchase_price: '',
  useful_life_years: '',
  salvage_value: '',
  warranty_expiry: '',
  supplier: '',
  status: 'available',
  condition: 'good',
  location: '',
  quantity: 1,
  minimum_stock_level: 0,
}

export function AssetForm({
  categories,
  defaultValues,
  onSubmit,
  submitLabel,
  isSubmitting = false,
}: AssetFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: { ...emptyDefaults, ...defaultValues },
  })

  const assetType = watch('asset_type')

  useEffect(() => {
    if (defaultValues) {
      reset({ ...emptyDefaults, ...defaultValues })
    }
  }, [defaultValues, reset])

  useEffect(() => {
    if (assetType === 'permanent') {
      setValue('quantity', 1)
    }
  }, [assetType, setValue])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="asset_code">Asset Code *</Label>
          <Input id="asset_code" {...register('asset_code')} placeholder="AST-001" />
          {errors.asset_code ? <p className="text-sm text-destructive">{errors.asset_code.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" {...register('name')} placeholder="Asset name" />
          {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" {...register('description')} placeholder="Optional description" rows={3} />
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={watch('category_id') || 'none'}
            onValueChange={(value) => setValue('category_id', value === 'none' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No category</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Asset Type *</Label>
          <Select
            value={watch('asset_type')}
            onValueChange={(value) => setValue('asset_type', value as AssetFormValues['asset_type'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSET_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type === 'permanent' ? 'Permanent' : 'Disposable'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="serial_number">Serial Number</Label>
          <Input id="serial_number" {...register('serial_number')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="barcode">Barcode</Label>
          <Input id="barcode" {...register('barcode')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="manufacturer">Manufacturer</Label>
          <Input id="manufacturer" {...register('manufacturer')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input id="model" {...register('model')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="operating_system">Operating System</Label>
          <Input id="operating_system" {...register('operating_system')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="purpose">Purpose</Label>
          <Input id="purpose" {...register('purpose')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchase_date">Purchase Date</Label>
          <Input id="purchase_date" type="date" {...register('purchase_date')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchase_price">Purchase Price</Label>
          <Input id="purchase_price" type="number" step="0.01" min="0" {...register('purchase_price')} />
          {errors.purchase_price ? (
            <p className="text-sm text-destructive">{errors.purchase_price.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="useful_life_years">Useful Life (years)</Label>
          <Input id="useful_life_years" type="number" min="1" max="100" {...register('useful_life_years')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="salvage_value">Salvage Value</Label>
          <Input id="salvage_value" type="number" step="0.01" min="0" {...register('salvage_value')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="warranty_expiry">Warranty Expiry</Label>
          <Input id="warranty_expiry" type="date" {...register('warranty_expiry')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplier">Supplier</Label>
          <Input id="supplier" {...register('supplier')} />
        </div>

        <div className="space-y-2">
          <Label>Status *</Label>
          <Select
            value={watch('status')}
            onValueChange={(value) => setValue('status', value as AssetFormValues['status'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSET_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Condition *</Label>
          <Select
            value={watch('condition')}
            onValueChange={(value) => setValue('condition', value as AssetFormValues['condition'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSET_CONDITIONS.map((condition) => (
                <SelectItem key={condition} value={condition}>
                  {labelize(condition)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" {...register('location')} placeholder="Storage location" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            min="0"
            {...register('quantity')}
            disabled={assetType === 'permanent'}
          />
          {errors.quantity ? <p className="text-sm text-destructive">{errors.quantity.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="minimum_stock_level">Minimum Stock Level</Label>
          <Input id="minimum_stock_level" type="number" min="0" {...register('minimum_stock_level')} />
          {errors.minimum_stock_level ? (
            <p className="text-sm text-destructive">{errors.minimum_stock_level.message}</p>
          ) : null}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

export function assetFormValuesToPayload(values: AssetFormValues, createdBy?: string) {
  return {
    asset_code: values.asset_code,
    name: values.name,
    description: values.description || null,
    category_id: values.category_id || null,
    asset_type: values.asset_type,
    serial_number: values.serial_number || null,
    barcode: values.barcode || null,
    manufacturer: values.manufacturer || null,
    model: values.model || null,
    operating_system: values.operating_system || null,
    purpose: values.purpose || null,
    purchase_date: values.purchase_date || null,
    purchase_price: values.purchase_price === '' || values.purchase_price == null ? null : Number(values.purchase_price),
    useful_life_years:
      values.useful_life_years === '' || values.useful_life_years == null
        ? null
        : Number(values.useful_life_years),
    salvage_value:
      values.salvage_value === '' || values.salvage_value == null ? null : Number(values.salvage_value),
    warranty_expiry: values.warranty_expiry || null,
    supplier: values.supplier || null,
    status: values.status,
    condition: values.condition,
    location: values.location || null,
    quantity: values.quantity,
    minimum_stock_level: values.minimum_stock_level,
    ...(createdBy ? { created_by: createdBy } : {}),
  }
}

export function assetToFormValues(asset: Tables<'assets'>): AssetFormValues {
  return {
    asset_code: asset.asset_code,
    name: asset.name,
    description: asset.description ?? '',
    category_id: asset.category_id ?? '',
    asset_type: asset.asset_type as AssetFormValues['asset_type'],
    serial_number: asset.serial_number ?? '',
    barcode: asset.barcode ?? '',
    manufacturer: asset.manufacturer ?? '',
    model: asset.model ?? '',
    operating_system: asset.operating_system ?? '',
    purpose: asset.purpose ?? '',
    purchase_date: asset.purchase_date ?? '',
    purchase_price: asset.purchase_price ?? '',
    useful_life_years: asset.useful_life_years ?? '',
    salvage_value: asset.salvage_value ?? '',
    warranty_expiry: asset.warranty_expiry ?? '',
    supplier: asset.supplier ?? '',
    status: asset.status as AssetFormValues['status'],
    condition: (asset.condition as AssetFormValues['condition']) || 'good',
    location: asset.location ?? '',
    quantity: asset.quantity,
    minimum_stock_level: asset.minimum_stock_level,
  }
}

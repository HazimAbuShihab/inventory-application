import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { LoadingState } from '@/components/common/LoadingState'
import { MaterialIcon } from '@/components/common/MaterialIcon'
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
  useActivateLocation,
  useCreateLocation,
  useDeactivateLocation,
  useLocations,
  useUpdateLocation,
} from '@/hooks/useLocations'
import { formatLocation } from '@/lib/utils'
import type { Tables } from '@/types/database'

type LocationFormState = {
  building: string
  floor: string
  room: string
  description: string
}

const emptyForm: LocationFormState = { building: '', floor: '', room: '', description: '' }

export default function LocationsPage() {
  const { data: locations = [], isLoading, error } = useLocations()
  const createMutation = useCreateLocation()
  const updateMutation = useUpdateLocation()
  const deactivateMutation = useDeactivateLocation()
  const activateMutation = useActivateLocation()

  const [buildingFilter, setBuildingFilter] = useState('')
  const [floorFilter, setFloorFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Tables<'locations'> | null>(null)
  const [form, setForm] = useState<LocationFormState>(emptyForm)
  const [toggleTarget, setToggleTarget] = useState<Tables<'locations'> | null>(null)

  const filtered = useMemo(() => {
    const buildingQ = buildingFilter.trim().toLowerCase()
    const floorQ = floorFilter.trim()
    return locations.filter((location) => {
      if (activeFilter === 'active' && !location.is_active) return false
      if (activeFilter === 'inactive' && location.is_active) return false
      if (buildingQ && !location.building.toLowerCase().includes(buildingQ)) return false
      if (floorQ && String(location.floor) !== floorQ) return false
      return true
    })
  }, [locations, buildingFilter, floorFilter, activeFilter])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(location: Tables<'locations'>) {
    setEditing(location)
    setForm({
      building: location.building,
      floor: String(location.floor),
      room: location.room ?? '',
      description: location.description ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.building.trim()) {
      toast.error('Building is required')
      return
    }

    const floor = Number.parseInt(form.floor, 10)
    if (Number.isNaN(floor)) {
      toast.error('Floor must be a valid number')
      return
    }

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          building: form.building.trim(),
          floor,
          room: form.room.trim() || null,
          description: form.description.trim() || null,
        })
        toast.success('Location updated')
      } else {
        await createMutation.mutateAsync({
          building: form.building.trim(),
          floor,
          room: form.room.trim() || null,
          description: form.description.trim() || null,
        })
        toast.success('Location created')
      }
      setDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save location')
    }
  }

  async function handleToggleActive() {
    if (!toggleTarget) return

    try {
      if (toggleTarget.is_active) {
        await deactivateMutation.mutateAsync(toggleTarget.id)
        toast.success('Location deactivated')
      } else {
        await activateMutation.mutateAsync(toggleTarget.id)
        toast.success('Location activated')
      }
      setToggleTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update location status')
    }
  }

  if (isLoading) return <LoadingState message="Loading locations..." />
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Locations" description="Manage asset storage and assignment locations" icon="location_on" />
        <p className="text-sm text-destructive">Failed to load locations: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Locations"
        description="Manage asset storage and assignment locations"
        icon="location_on"
        actions={
          <Button onClick={openCreate}>
            <MaterialIcon name="add" className="text-[18px]" />
            <span className="hidden sm:inline">Add New Location</span>
            <span className="sm:hidden">Add</span>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          placeholder="Building"
          value={buildingFilter}
          onChange={(e) => setBuildingFilter(e.target.value)}
          className="bg-slate-50 sm:max-w-[200px]"
        />
        <Input
          type="number"
          placeholder="Floor"
          value={floorFilter}
          onChange={(e) => setFloorFilter(e.target.value)}
          className="bg-slate-50 sm:max-w-[120px]"
        />
        <Select
          value={activeFilter}
          onValueChange={(v) => setActiveFilter(v as 'all' | 'active' | 'inactive')}
        >
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-12 text-center shadow-card">
          <MaterialIcon name="location_off" className="text-[48px] text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">No locations found</p>
          <Button className="mt-4" onClick={openCreate}>
            <MaterialIcon name="add" className="text-[18px]" />
            Add Location
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((location) => (
            <div
              key={location.id}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-card transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MaterialIcon name="location_on" className="text-[22px]" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{formatLocation(location)}</h3>
                  {location.description ? (
                    <p className="mt-1 text-sm text-slate-500">{location.description}</p>
                  ) : null}
                </div>
                <Badge variant={location.is_active ? 'success' : 'secondary'}>
                  {location.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => openEdit(location)}>
                  Edit
                </Button>
                <Button
                  variant="outline"
                  className={
                    location.is_active
                      ? 'border-orange-200 text-orange-700 hover:bg-orange-50'
                      : 'border-green-200 text-green-700 hover:bg-green-50'
                  }
                  onClick={() => setToggleTarget(location)}
                >
                  {location.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Location' : 'Add New Location'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update location details.' : 'Add a new building, floor, and room.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loc-building">Building *</Label>
              <Input
                id="loc-building"
                value={form.building}
                onChange={(e) => setForm((prev) => ({ ...prev, building: e.target.value }))}
                placeholder="Enter building name"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="loc-floor">Floor *</Label>
                <Input
                  id="loc-floor"
                  type="number"
                  min="0"
                  value={form.floor}
                  onChange={(e) => setForm((prev) => ({ ...prev, floor: e.target.value }))}
                  placeholder="Enter floor number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-room">Room</Label>
                <Input
                  id="loc-room"
                  value={form.room}
                  onChange={(e) => setForm((prev) => ({ ...prev, room: e.target.value }))}
                  placeholder="Enter room number/name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-description">Description</Label>
              <Textarea
                id="loc-description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Enter location description"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? 'Update Location' : 'Create Location'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(toggleTarget)} onOpenChange={(open) => !open && setToggleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{toggleTarget?.is_active ? 'Deactivate Location' : 'Activate Location'}</DialogTitle>
            <DialogDescription>
              {toggleTarget?.is_active
                ? `Deactivate "${toggleTarget ? formatLocation(toggleTarget) : ''}"? It cannot be used for new assignments while inactive.`
                : `Reactivate "${toggleTarget ? formatLocation(toggleTarget) : ''}"?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={toggleTarget?.is_active ? 'destructive' : 'default'}
              onClick={handleToggleActive}
              disabled={deactivateMutation.isPending || activateMutation.isPending}
            >
              {toggleTarget?.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { EventRow } from '@/lib/domain'
import type { TablesInsert } from '@agpe/shared/types/supabase'

export interface EventFormValues {
  name: string
  date: string
  location: string
  description: string
  start_time: string
  end_time: string
}

interface EventFormProps {
  open: boolean
  event: EventRow | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: TablesInsert<'kermesse_events'>) => Promise<boolean>
}

function toForm(event: EventRow | null): EventFormValues {
  return {
    name: event?.name ?? '',
    date: event?.date ?? '',
    location: event?.location ?? '',
    description: event?.description ?? '',
    start_time: event?.start_time?.slice(0, 5) ?? '',
    end_time: event?.end_time?.slice(0, 5) ?? '',
  }
}

// Modale de création / édition d'un événement.
export function EventForm({ open, event, onOpenChange, onSubmit }: EventFormProps) {
  const [values, setValues] = useState<EventFormValues>(toForm(event))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setValues(toForm(event))
  }, [open, event])

  function update(field: keyof EventFormValues, value: string): void {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setSaving(true)
    try {
      const ok = await onSubmit({
        name: values.name.trim(),
        date: values.date,
        location: values.location.trim() || null,
        description: values.description.trim() || null,
        start_time: values.start_time || null,
        end_time: values.end_time || null,
      })
      if (ok) onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {event ? 'Modifier l\'événement' : 'Nouvel événement'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-name">Nom</Label>
            <Input
              id="event-name"
              required
              value={values.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Kermesse 2026"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-date">Date</Label>
            <Input
              id="event-date"
              type="date"
              required
              value={values.date}
              onChange={(e) => update('date', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-start">Heure de début</Label>
              <Input
                id="event-start"
                type="time"
                value={values.start_time}
                onChange={(e) => update('start_time', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-end">Heure de fin</Label>
              <Input
                id="event-end"
                type="time"
                value={values.end_time}
                onChange={(e) => update('end_time', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-location">Lieu</Label>
            <Input
              id="event-location"
              value={values.location}
              onChange={(e) => update('location', e.target.value)}
              placeholder="École élémentaire, cour principale"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-description">Description</Label>
            <Textarea
              id="event-description"
              value={values.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={saving} aria-busy={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

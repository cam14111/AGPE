import { useEffect, useMemo, useState } from 'react'
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
import { cn } from '@/lib/utils'
import { getEventDays, formatDayShort } from '@/lib/date-utils'
import { standOpenDays, type StandWithSlots } from '@/lib/domain'
import type { TablesInsert } from '@agpe/shared/types/supabase'

const EMOJI_CHOICES = [
  '🎯', '🎪', '🎨', '🍿', '🧁', '🎲', '🎣', '🎡',
  '🍭', '🏀', '🎶', '🤡', '🎟️', '🍦', '🪀', '🎈',
]

interface StandFormValues {
  name: string
  description: string
  location_detail: string
  emoji: string
}

interface StandFormProps {
  open: boolean
  stand: StandWithSlots | null
  eventId: string
  eventStartDate: string
  eventEndDate: string
  onOpenChange: (open: boolean) => void
  onSubmit: (
    values: TablesInsert<'kermesse_stands'>,
    openDays: string[],
  ) => Promise<boolean>
  onCreated?: () => void
}

function toForm(stand: StandWithSlots | null): StandFormValues {
  return {
    name: stand?.name ?? '',
    description: stand?.description ?? '',
    location_detail: stand?.location_detail ?? '',
    emoji: stand?.emoji ?? '🎯',
  }
}

// Modale de création / édition d'un stand : informations + dates d'ouverture (cases à cocher).
export function StandForm({
  open,
  stand,
  eventId,
  eventStartDate,
  eventEndDate,
  onOpenChange,
  onSubmit,
  onCreated,
}: StandFormProps) {
  const [values, setValues] = useState<StandFormValues>(toForm(stand))
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const eventDays = useMemo(
    () => getEventDays(eventStartDate, eventEndDate),
    [eventStartDate, eventEndDate],
  )

  // Dates portant déjà des créneaux (édition) : averties si décochées.
  const daysWithSlots = useMemo(() => {
    const set = new Set<string>()
    for (const slot of stand?.kermesse_slots ?? []) {
      if (slot.date) set.add(slot.date)
    }
    return set
  }, [stand])

  useEffect(() => {
    if (!open) return
    setValues(toForm(stand))
    setError(null)
    if (stand) {
      const days = standOpenDays(stand)
      setSelectedDays(new Set(days.length > 0 ? days : eventDays))
    } else {
      // Toutes les dates cochées par défaut à la création.
      setSelectedDays(new Set(eventDays))
    }
  }, [open, stand, eventDays])

  function update(field: keyof StandFormValues, value: string): void {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  function toggleDay(date: string): void {
    setSelectedDays((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)

    const openDays = [...selectedDays].sort((a, b) => a.localeCompare(b))
    if (openDays.length === 0) {
      setError('Sélectionnez au moins une date d\'ouverture.')
      return
    }

    setSaving(true)
    try {
      const ok = await onSubmit(
        {
          event_id: eventId,
          name: values.name.trim(),
          description: values.description.trim() || null,
          location_detail: values.location_detail.trim() || null,
          emoji: values.emoji || null,
        },
        openDays,
      )
      if (!ok) return
      if (onCreated) onCreated()
      else onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{stand ? 'Modifier le stand' : 'Nouveau stand'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stand-name">Nom</Label>
            <Input
              id="stand-name"
              required
              value={values.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Pêche aux canards"
            />
          </div>

          <div className="space-y-2">
            <Label>Dates d'ouverture</Label>
            <div className="space-y-1.5 rounded-md border p-3" role="group" aria-label="Dates d'ouverture du stand">
              {eventDays.map((date) => {
                const checked = selectedDays.has(date)
                const hasSlots = daysWithSlots.has(date)
                return (
                  <label
                    key={date}
                    className="flex items-center gap-2 text-sm capitalize"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDay(date)}
                      className="h-4 w-4"
                    />
                    {formatDayShort(date)}
                    {hasSlots && !checked && (
                      <span className="text-xs text-amber-600 normal-case">
                        (créneaux existants — sera conservée)
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Emoji</Label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Choix de l'emoji">
              {EMOJI_CHOICES.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => update('emoji', emoji)}
                  aria-label={`Emoji ${emoji}`}
                  aria-pressed={values.emoji === emoji}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-md border text-xl',
                    values.emoji === emoji
                      ? 'border-primary ring-2 ring-primary'
                      : 'border-input hover:bg-accent',
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stand-location">Emplacement</Label>
            <Input
              id="stand-location"
              value={values.location_detail}
              onChange={(e) => update('location_detail', e.target.value)}
              placeholder="Salle des fêtes — côté jardin"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stand-description">Description</Label>
            <Textarea
              id="stand-description"
              value={values.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

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

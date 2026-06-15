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
import { getEventDays, formatEventDate } from '@/lib/date-utils'
import type { EventRow, EventDayScheduleRow } from '@/lib/domain'
import type { TablesInsert } from '@agpe/shared/types/supabase'

interface DayScheduleInput {
  date: string
  open_time: string
  close_time: string
}

export interface EventFormValues {
  name: string
  start_date: string
  end_date: string
  location: string
  description: string
  start_time: string
  end_time: string
}

interface EventFormProps {
  open: boolean
  event: EventRow | null
  daySchedules: EventDayScheduleRow[]
  onOpenChange: (open: boolean) => void
  onSubmit: (values: TablesInsert<'kermesse_events'>) => Promise<boolean>
  onSubmitDaySchedules?: (schedules: DayScheduleInput[]) => Promise<void>
  onCreated?: () => void
}

function toForm(event: EventRow | null): EventFormValues {
  return {
    name: event?.name ?? '',
    start_date: event?.start_date ?? event?.date ?? '',
    end_date: event?.end_date ?? event?.date ?? '',
    location: event?.location ?? '',
    description: event?.description ?? '',
    start_time: event?.start_time?.slice(0, 5) ?? '',
    end_time: event?.end_time?.slice(0, 5) ?? '',
  }
}

// Modale de création / édition d'un événement (supporte les événements multi-jours).
export function EventForm({
  open,
  event,
  daySchedules,
  onOpenChange,
  onSubmit,
  onSubmitDaySchedules,
  onCreated,
}: EventFormProps) {
  const [values, setValues] = useState<EventFormValues>(toForm(event))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customDays, setCustomDays] = useState<DayScheduleInput[]>([])
  const [showCustom, setShowCustom] = useState(false)

  const isMultiDay =
    values.start_date && values.end_date && values.end_date > values.start_date

  useEffect(() => {
    if (!open) return
    const form = toForm(event)
    setValues(form)
    setError(null)
    setShowCustom(false)
    // Construit la liste de TOUS les jours de l'événement, en appliquant les
    // horaires personnalisés existants et les horaires par défaut sinon.
    const days =
      form.start_date && form.end_date && form.end_date >= form.start_date
        ? getEventDays(form.start_date, form.end_date)
        : []
    setCustomDays(
      days.map((date) => {
        const custom = daySchedules.find((s) => s.date === date)
        return custom
          ? {
              date,
              open_time: custom.open_time.slice(0, 5),
              close_time: custom.close_time.slice(0, 5),
            }
          : { date, open_time: form.start_time, close_time: form.end_time }
      }),
    )
  }, [open, event, daySchedules])

  // Recalcule la liste des jours personnalisés quand la plage change.
  useEffect(() => {
    if (!isMultiDay) return
    const days = getEventDays(values.start_date, values.end_date)
    setCustomDays((prev) =>
      days.map((date) => {
        const existing = prev.find((d) => d.date === date)
        return existing ?? {
          date,
          open_time: values.start_time,
          close_time: values.end_time,
        }
      }),
    )
  }, [values.start_date, values.end_date])

  function update(field: keyof EventFormValues, value: string): void {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  function updateCustomDay(date: string, field: 'open_time' | 'close_time', val: string): void {
    setCustomDays((prev) =>
      prev.map((d) => (d.date === date ? { ...d, [field]: val } : d)),
    )
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)

    if (values.end_date < values.start_date) {
      setError('La date de fin doit être égale ou postérieure à la date de début.')
      return
    }

    setSaving(true)
    try {
      const ok = await onSubmit({
        name: values.name.trim(),
        start_date: values.start_date,
        end_date: values.end_date,
        location: values.location.trim() || null,
        description: values.description.trim() || null,
        start_time: values.start_time || null,
        end_time: values.end_time || null,
      })

      if (!ok) return

      // Sauvegarde les horaires personnalisés si nécessaire.
      if (onSubmitDaySchedules && isMultiDay) {
        const modified = customDays.filter(
          (d) =>
            d.open_time !== values.start_time ||
            d.close_time !== values.end_time,
        )
        if (modified.length > 0) {
          await onSubmitDaySchedules(modified)
        }
      }

      // Laisse la page contrôler la fermeture (pour le workflow post-création).
      if (onCreated) {
        onCreated()
      } else {
        onOpenChange(false)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {event ? 'Modifier l\'événement' : 'Nouvel événement'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-name">Nom</Label>
            <Input
              id="event-name"
              required
              value={values.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Événement 2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-start-date">Date de début</Label>
              <Input
                id="event-start-date"
                type="date"
                required
                value={values.start_date}
                onChange={(e) => update('start_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-end-date">Date de fin</Label>
              <Input
                id="event-end-date"
                type="date"
                required
                value={values.end_date}
                min={values.start_date}
                onChange={(e) => update('end_date', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-start">
                Heure d'ouverture{isMultiDay ? ' (par défaut)' : ''}
              </Label>
              <Input
                id="event-start"
                type="time"
                value={values.start_time}
                onChange={(e) => update('start_time', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-end">
                Heure de fermeture{isMultiDay ? ' (par défaut)' : ''}
              </Label>
              <Input
                id="event-end"
                type="time"
                value={values.end_time}
                onChange={(e) => update('end_time', e.target.value)}
              />
            </div>
          </div>

          {/* Horaires personnalisés par journée (événements multi-jours uniquement) */}
          {isMultiDay && onSubmitDaySchedules && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowCustom((v) => !v)}
                className="text-sm text-primary underline underline-offset-2"
              >
                {showCustom
                  ? 'Masquer les horaires par journée'
                  : 'Personnaliser les horaires par journée'}
              </button>

              {showCustom && (
                <div className="space-y-3 rounded-md border p-3">
                  {customDays.map((day) => (
                    <div key={day.date} className="space-y-1">
                      <p className="text-xs font-medium text-slate-600 capitalize">
                        {formatEventDate(day.date)}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="time"
                          value={day.open_time}
                          onChange={(e) =>
                            updateCustomDay(day.date, 'open_time', e.target.value)
                          }
                          aria-label={`Ouverture ${day.date}`}
                        />
                        <Input
                          type="time"
                          value={day.close_time}
                          onChange={(e) =>
                            updateCustomDay(day.date, 'close_time', e.target.value)
                          }
                          aria-label={`Fermeture ${day.date}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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

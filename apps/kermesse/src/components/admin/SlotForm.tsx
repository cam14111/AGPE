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
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  isDateInRange,
  resolveOpenTime,
  resolveCloseTime,
  timesOverlap,
} from '@/lib/date-utils'
import type { SlotRow, EventRow, EventDayScheduleRow } from '@/lib/domain'
import type { TablesInsert } from '@agpe/shared/types/supabase'

interface SlotFormValues {
  date: string
  start_time: string
  end_time: string
  max_volunteers: string
}

type ConfirmStep = 'stand_date' | 'event_range' | 'hours' | null

interface SlotFormProps {
  open: boolean
  slot: SlotRow | null
  standId: string
  standDate: string
  eventRow: EventRow
  daySchedules: EventDayScheduleRow[]
  existingSlots: SlotRow[]
  onOpenChange: (open: boolean) => void
  onSubmit: (values: TablesInsert<'kermesse_slots'>) => Promise<boolean>
}

function toForm(slot: SlotRow | null, standDate: string): SlotFormValues {
  return {
    date: slot?.date ?? standDate,
    start_time: slot?.start_time?.slice(0, 5) ?? '',
    end_time: slot?.end_time?.slice(0, 5) ?? '',
    max_volunteers: slot ? String(slot.max_volunteers) : '1',
  }
}

// Modale de création / édition d'un créneau avec date, préremplissage et validations.
export function SlotForm({
  open,
  slot,
  standId,
  standDate,
  eventRow,
  daySchedules,
  existingSlots,
  onOpenChange,
  onSubmit,
}: SlotFormProps) {
  const [values, setValues] = useState<SlotFormValues>(toForm(slot, standDate))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmStep, setConfirmStep] = useState<ConfirmStep>(null)
  const [pendingValues, setPendingValues] = useState<TablesInsert<'kermesse_slots'> | null>(null)

  const isCreating = slot === null

  useEffect(() => {
    if (!open) return
    setError(null)
    setConfirmStep(null)

    if (slot) {
      setValues(toForm(slot, standDate))
      return
    }

    // Préremplissage intelligent pour la création.
    const date = standDate
    const slotsForDate = existingSlots.filter((s) => s.date === date)

    let startTime = resolveOpenTime(eventRow, daySchedules, date) ?? ''

    if (slotsForDate.length > 0) {
      // Heure de fin du dernier créneau existant.
      const maxEnd = slotsForDate.reduce(
        (max, s) => (s.end_time > max ? s.end_time : max),
        '',
      )
      if (maxEnd) startTime = maxEnd.slice(0, 5)
    }

    setValues({ date, start_time: startTime, end_time: '', max_volunteers: '1' })
  }, [open, slot, standDate, eventRow, daySchedules, existingSlots])

  function update(field: keyof SlotFormValues, value: string): void {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  function buildPayload(): TablesInsert<'kermesse_slots'> {
    return {
      stand_id: standId,
      date: values.date,
      start_time: values.start_time,
      end_time: values.end_time,
      max_volunteers: Number.parseInt(values.max_volunteers, 10),
    }
  }

  // Effectue la soumission finale après toutes les confirmations.
  async function doSubmit(): Promise<void> {
    if (!pendingValues) return
    setSaving(true)
    try {
      const ok = await onSubmit(pendingValues)
      if (ok) onOpenChange(false)
    } finally {
      setSaving(false)
      setConfirmStep(null)
      setPendingValues(null)
    }
  }

  // Avance à l'étape de confirmation suivante, ou soumet si tout est validé.
  async function proceedFromStep(step: ConfirmStep): Promise<void> {
    if (!pendingValues) return

    const date = pendingValues.date ?? standDate
    const start = pendingValues.start_time
    const end = pendingValues.end_time

    if (step === 'stand_date') {
      // Vérifie maintenant la plage de l'événement.
      const inRange = isDateInRange(date, eventRow.start_date, eventRow.end_date)
      if (!inRange) {
        setConfirmStep('event_range')
        return
      }
    }

    if (step === 'stand_date' || step === 'event_range') {
      // Vérifie les horaires.
      const open = resolveOpenTime(eventRow, daySchedules, date)
      const close = resolveCloseTime(eventRow, daySchedules, date)
      if ((open && start < open) || (close && end > close)) {
        setConfirmStep('hours')
        return
      }
    }

    // Toutes les confirmations passées : on soumet.
    await doSubmit()
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)

    const max = Number.parseInt(values.max_volunteers, 10)
    if (Number.isNaN(max) || max < 1) {
      setError('Le nombre de bénévoles doit être au moins 1.')
      return
    }
    if (values.end_time <= values.start_time) {
      setError('L\'heure de fin doit être après l\'heure de début.')
      return
    }

    const date = values.date || standDate

    // Vérifie chevauchement (erreur bloquante, pas de confirmation).
    if (isCreating) {
      const overlaps = existingSlots.some(
        (ex) =>
          ex.id !== slot &&
          ex.date === date &&
          timesOverlap(values.start_time, values.end_time, ex.start_time, ex.end_time),
      )
      if (overlaps) {
        setError(
          'Ce créneau chevauche un créneau déjà existant pour ce stand. Modifiez les horaires.',
        )
        return
      }
    }

    const payload = buildPayload()
    setPendingValues(payload)

    // Étape 1 : date différente de celle du stand ?
    if (isCreating && values.date !== standDate) {
      setConfirmStep('stand_date')
      return
    }

    // Étape 2 : date hors période de l'événement ?
    const inRange = isDateInRange(date, eventRow.start_date, eventRow.end_date)
    if (!inRange) {
      setConfirmStep('event_range')
      return
    }

    // Étape 3 : horaires hors plage applicable ?
    const openT = resolveOpenTime(eventRow, daySchedules, date)
    const closeT = resolveCloseTime(eventRow, daySchedules, date)
    if ((openT && values.start_time < openT) || (closeT && values.end_time > closeT)) {
      setConfirmStep('hours')
      return
    }

    // Aucun avertissement : on soumet directement.
    setSaving(true)
    try {
      const ok = await onSubmit(payload)
      if (ok) onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const confirmMessages: Record<
    NonNullable<ConfirmStep>,
    { title: string; description: string }
  > = {
    stand_date: {
      title: 'Date différente du stand',
      description:
        'Ce créneau est en dehors de la date d\'ouverture du stand. Voulez-vous quand même continuer ?',
    },
    event_range: {
      title: 'Date hors période de l\'événement',
      description:
        'Ce créneau est en dehors de la période de l\'événement. Voulez-vous quand même continuer ?',
    },
    hours: {
      title: 'Horaires hors plage autorisée',
      description:
        'Ce créneau est en dehors des horaires d\'ouverture prévus pour cette journée de l\'événement. Voulez-vous quand même continuer ?',
    },
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{slot ? 'Modifier le créneau' : 'Nouveau créneau'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slot-date">Date</Label>
              <Input
                id="slot-date"
                type="date"
                required
                value={values.date}
                onChange={(e) => update('date', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slot-start">Heure de début</Label>
                <Input
                  id="slot-start"
                  type="time"
                  required
                  value={values.start_time}
                  onChange={(e) => update('start_time', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slot-end">Heure de fin</Label>
                <Input
                  id="slot-end"
                  type="time"
                  required
                  value={values.end_time}
                  onChange={(e) => update('end_time', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot-max">Bénévoles nécessaires</Label>
              <Input
                id="slot-max"
                type="number"
                min={1}
                required
                value={values.max_volunteers}
                onChange={(e) => update('max_volunteers', e.target.value)}
                aria-describedby={error ? 'slot-error' : undefined}
              />
            </div>
            {error && (
              <p id="slot-error" role="alert" className="text-sm text-red-600">
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

      {confirmStep && (
        <ConfirmDialog
          open={confirmStep !== null}
          title={confirmMessages[confirmStep].title}
          description={confirmMessages[confirmStep].description}
          confirmLabel="Continuer"
          onConfirm={async () => {
            await proceedFromStep(confirmStep)
          }}
          onOpenChange={(o) => {
            if (!o) {
              setConfirmStep(null)
              setPendingValues(null)
            }
          }}
        />
      )}
    </>
  )
}

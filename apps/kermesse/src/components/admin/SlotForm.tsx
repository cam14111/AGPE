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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  resolveOpenTime,
  resolveCloseTime,
  firstFreeStart,
  formatDayShort,
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

type ConfirmStep = 'stand_days' | 'hours' | 'overlap'

interface SlotFormProps {
  open: boolean
  slot: SlotRow | null
  standId: string
  standDate: string
  standOpenDays: string[]
  eventRow: EventRow
  daySchedules: EventDayScheduleRow[]
  existingSlots: SlotRow[]
  onOpenChange: (open: boolean) => void
  onSubmit: (values: TablesInsert<'kermesse_slots'>) => Promise<boolean>
}

const CONFIRM_MESSAGES: Record<ConfirmStep, { title: string; description: string }> = {
  stand_days: {
    title: 'Hors dates d\'ouverture du stand',
    description:
      'Attention, ce créneau est en dehors des dates d\'ouverture du stand. Voulez-vous quand même continuer ?',
  },
  hours: {
    title: 'Hors plage d\'ouverture',
    description:
      'Attention, ce créneau est en dehors de la plage d\'ouverture du stand. Voulez-vous quand même continuer ?',
  },
  overlap: {
    title: 'Chevauchement de créneaux',
    description:
      'Attention, ce créneau chevauche un créneau déjà existant pour ce stand. Voulez-vous quand même continuer ?',
  },
}

// Modale de création / édition d'un créneau avec date limitée aux jours d'ouverture,
// préremplissage intelligent et avertissements confirmables.
export function SlotForm({
  open,
  slot,
  standId,
  standDate,
  standOpenDays,
  eventRow,
  daySchedules,
  existingSlots,
  onOpenChange,
  onSubmit,
}: SlotFormProps) {
  const [values, setValues] = useState<SlotFormValues>({
    date: standDate,
    start_time: '',
    end_time: '',
    max_volunteers: '1',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingSteps, setPendingSteps] = useState<ConfirmStep[]>([])
  const [pendingValues, setPendingValues] = useState<TablesInsert<'kermesse_slots'> | null>(null)

  // Options de date : jours d'ouverture (+ date du créneau en édition si hors liste).
  const dateOptions = [...standOpenDays]
  if (slot?.date && !dateOptions.includes(slot.date)) dateOptions.unshift(slot.date)

  useEffect(() => {
    if (!open) return
    setError(null)
    setPendingSteps([])
    setPendingValues(null)

    if (slot) {
      setValues({
        date: slot.date ?? standDate,
        start_time: slot.start_time?.slice(0, 5) ?? '',
        end_time: slot.end_time?.slice(0, 5) ?? '',
        max_volunteers: String(slot.max_volunteers),
      })
      return
    }

    // Préremplissage intelligent (création) : 1re plage libre du jour.
    const date = standDate
    const openT = resolveOpenTime(eventRow, daySchedules, date)
    const closeT = resolveCloseTime(eventRow, daySchedules, date)
    const existingForDate = existingSlots.filter((s) => (s.date ?? '') === date)
    const lastEnd = existingForDate.reduce(
      (max, s) => (s.end_time.slice(0, 5) > max ? s.end_time.slice(0, 5) : max),
      '',
    )
    let startTime = ''
    if (openT && closeT) {
      startTime =
        firstFreeStart(openT, closeT, 0, existingForDate, lastEnd || undefined) ?? openT
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

  // Calcule les avertissements applicables, dans l'ordre.
  function computeSteps(): ConfirmStep[] {
    const { date, start_time: start, end_time: end } = values
    const steps: ConfirmStep[] = []

    if (!standOpenDays.includes(date)) steps.push('stand_days')

    const openT = resolveOpenTime(eventRow, daySchedules, date)
    const closeT = resolveCloseTime(eventRow, daySchedules, date)
    if ((openT && start < openT) || (closeT && end > closeT)) steps.push('hours')

    const overlaps = existingSlots.some(
      (ex) =>
        ex.id !== slot?.id &&
        (ex.date ?? '') === date &&
        timesOverlap(start, end, ex.start_time, ex.end_time),
    )
    if (overlaps) steps.push('overlap')

    return steps
  }

  async function doSubmit(payload: TablesInsert<'kermesse_slots'>): Promise<void> {
    setSaving(true)
    try {
      const ok = await onSubmit(payload)
      if (ok) onOpenChange(false)
    } finally {
      setSaving(false)
      setPendingSteps([])
      setPendingValues(null)
    }
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

    const payload = buildPayload()
    const steps = computeSteps()
    if (steps.length === 0) {
      await doSubmit(payload)
      return
    }
    setPendingValues(payload)
    setPendingSteps(steps)
  }

  // Confirme l'étape courante : passe à la suivante ou soumet.
  async function confirmCurrentStep(): Promise<void> {
    const remaining = pendingSteps.slice(1)
    if (remaining.length > 0) {
      setPendingSteps(remaining)
      return
    }
    if (pendingValues) await doSubmit(pendingValues)
  }

  const currentStep = pendingSteps[0] ?? null

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
              <Select value={values.date} onValueChange={(v) => update('date', v)}>
                <SelectTrigger id="slot-date">
                  <SelectValue placeholder="Choisir une journée" />
                </SelectTrigger>
                <SelectContent>
                  {dateOptions.map((day) => (
                    <SelectItem key={day} value={day} className="capitalize">
                      {formatDayShort(day)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {currentStep && (
        <ConfirmDialog
          open={currentStep !== null}
          title={CONFIRM_MESSAGES[currentStep].title}
          description={CONFIRM_MESSAGES[currentStep].description}
          confirmLabel="Continuer"
          onConfirm={confirmCurrentStep}
          onOpenChange={(o) => {
            if (!o) {
              setPendingSteps([])
              setPendingValues(null)
            }
          }}
        />
      )}
    </>
  )
}

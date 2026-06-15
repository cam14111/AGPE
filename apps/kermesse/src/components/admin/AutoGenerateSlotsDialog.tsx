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
  resolveOpenTime,
  resolveCloseTime,
  generateSlotIntervals,
  timesOverlap,
  formatTime,
} from '@/lib/date-utils'
import type { EventRow, EventDayScheduleRow, SlotRow } from '@/lib/domain'
import type { TablesInsert } from '@agpe/shared/types/supabase'

interface AutoGenerateSlotsDialogProps {
  open: boolean
  standId: string
  standDate: string
  eventRow: EventRow
  daySchedules: EventDayScheduleRow[]
  existingSlots: SlotRow[]
  onGenerate: (slots: TablesInsert<'kermesse_slots'>[]) => Promise<boolean>
  onOpenChange: (open: boolean) => void
}

// Génère automatiquement N créneaux de durée fixe pour un stand.
export function AutoGenerateSlotsDialog({
  open,
  standId,
  standDate,
  eventRow,
  daySchedules,
  existingSlots,
  onGenerate,
  onOpenChange,
}: AutoGenerateSlotsDialogProps) {
  const [count, setCount] = useState('4')
  const [duration, setDuration] = useState('60')
  const [maxVolunteers, setMaxVolunteers] = useState('1')
  const [saving, setSaving] = useState(false)
  const [overflowOpen, setOverflowOpen] = useState(false)
  const [pendingSlots, setPendingSlots] = useState<TablesInsert<'kermesse_slots'>[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setCount('4')
      setDuration('60')
      setMaxVolunteers('1')
      setError(null)
    }
  }, [open])

  function buildSlots(): {
    slots: TablesInsert<'kermesse_slots'>[]
    overflow: boolean
  } | null {
    const n = Number.parseInt(count, 10)
    const d = Number.parseInt(duration, 10)
    const v = Number.parseInt(maxVolunteers, 10)

    if (Number.isNaN(n) || n < 1) {
      setError('Le nombre de créneaux doit être au moins 1.')
      return null
    }
    if (Number.isNaN(d) || d < 1) {
      setError('La durée doit être au moins 1 minute.')
      return null
    }
    if (Number.isNaN(v) || v < 1) {
      setError('Le nombre de bénévoles doit être au moins 1.')
      return null
    }

    const openTime = resolveOpenTime(eventRow, daySchedules, standDate)
    if (!openTime) {
      setError('Aucun horaire d\'ouverture défini pour ce jour.')
      return null
    }

    const closeTime = resolveCloseTime(eventRow, daySchedules, standDate)
    const { slots: intervals, overflow } = generateSlotIntervals(openTime, closeTime, d, n)

    // Filtre les chevauchements avec les créneaux existants.
    const slotsToCreate = intervals
      .filter(
        (interval) =>
          !existingSlots.some(
            (ex) =>
              ex.date === standDate &&
              timesOverlap(interval.start_time, interval.end_time, ex.start_time, ex.end_time),
          ),
      )
      .map((interval) => ({
        stand_id: standId,
        date: standDate,
        start_time: interval.start_time,
        end_time: interval.end_time,
        max_volunteers: v,
      }))

    return { slots: slotsToCreate, overflow }
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    const result = buildSlots()
    if (!result) return

    if (result.overflow) {
      setPendingSlots(result.slots)
      setOverflowOpen(true)
    } else {
      await doGenerate(result.slots)
    }
  }

  async function doGenerate(slots: TablesInsert<'kermesse_slots'>[]): Promise<void> {
    if (slots.length === 0) {
      setError('Aucun créneau à créer (tous chevauchent des créneaux existants).')
      return
    }
    setSaving(true)
    try {
      const ok = await onGenerate(slots)
      if (ok) onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const openTime = resolveOpenTime(eventRow, daySchedules, standDate)
  const closeTime = resolveCloseTime(eventRow, daySchedules, standDate)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Générer des créneaux automatiquement</DialogTitle>
          </DialogHeader>

          {openTime && (
            <p className="text-sm text-slate-500">
              Plage horaire applicable : {formatTime(openTime)}
              {closeTime ? ` – ${formatTime(closeTime)}` : ''}
            </p>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gen-count">Nombre de créneaux</Label>
                <Input
                  id="gen-count"
                  type="number"
                  min={1}
                  required
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gen-duration">Durée (minutes)</Label>
                <Input
                  id="gen-duration"
                  type="number"
                  min={1}
                  required
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gen-volunteers">Bénévoles par créneau</Label>
              <Input
                id="gen-volunteers"
                type="number"
                min={1}
                required
                value={maxVolunteers}
                onChange={(e) => setMaxVolunteers(e.target.value)}
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
                {saving ? 'Génération…' : 'Générer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={overflowOpen}
        title="Créneaux hors horaires"
        description="Les créneaux générés dépassent les horaires d'ouverture prévus pour cette journée. Voulez-vous quand même les créer ?"
        confirmLabel="Créer quand même"
        onConfirm={async () => {
          await doGenerate(pendingSlots)
        }}
        onOpenChange={(o) => {
          if (!o) setOverflowOpen(false)
        }}
      />
    </>
  )
}

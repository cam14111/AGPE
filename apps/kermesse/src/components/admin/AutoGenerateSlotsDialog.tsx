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
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SlotGenerationPreview } from '@/components/admin/SlotGenerationPreview'
import {
  firstFreeStart,
  generateSlotsAcrossDays,
  resolveStandDays,
  eventTimeWindow,
  formatDayShort,
} from '@/lib/date-utils'
import type { EventRow, EventDayScheduleRow, SlotRow } from '@/lib/domain'
import type { TablesInsert } from '@agpe/shared/types/supabase'

interface AutoGenerateSlotsDialogProps {
  open: boolean
  standId: string
  startDay: string
  standOpenDays: string[]
  eventRow: EventRow
  daySchedules: EventDayScheduleRow[]
  existingSlots: SlotRow[]
  onGenerate: (slots: TablesInsert<'kermesse_slots'>[]) => Promise<boolean>
  onOpenChange: (open: boolean) => void
}

// Génère dynamiquement des créneaux répartis sur les journées d'ouverture du stand,
// avec un aperçu visuel mis à jour en direct.
export function AutoGenerateSlotsDialog({
  open,
  standId,
  startDay,
  standOpenDays,
  eventRow,
  daySchedules,
  existingSlots,
  onGenerate,
  onOpenChange,
}: AutoGenerateSlotsDialogProps) {
  const [startDate, setStartDate] = useState(startDay)
  const [startTime, setStartTime] = useState('')
  const [count, setCount] = useState('4')
  const [duration, setDuration] = useState('60')
  const [maxVolunteers, setMaxVolunteers] = useState('1')
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Journées d'ouverture avec leurs horaires applicables.
  const days = useMemo(
    () => resolveStandDays(eventRow, daySchedules, standOpenDays),
    [standOpenDays, eventRow, daySchedules],
  )

  const existingByDate = useMemo(() => {
    const map = new Map<string, { start_time: string; end_time: string }[]>()
    for (const s of existingSlots) {
      const d = s.date ?? ''
      const list = map.get(d) ?? []
      list.push({ start_time: s.start_time, end_time: s.end_time })
      map.set(d, list)
    }
    return map
  }, [existingSlots])

  // Réinitialise les champs à l'ouverture.
  useEffect(() => {
    if (!open) return
    setStartDate(startDay)
    setCount('4')
    setDuration('60')
    setMaxVolunteers('1')
    setError(null)
  }, [open, startDay])

  // Préremplit l'heure de début intelligemment au changement de journée.
  useEffect(() => {
    if (!open) return
    const day = days.find((d) => d.date === startDate)
    if (!day) {
      setStartTime('')
      return
    }
    const dur = Number.parseInt(duration, 10) || 60
    const existing = existingByDate.get(startDate) ?? []
    setStartTime(firstFreeStart(day.open, day.close, dur, existing) ?? day.open)
    // Volontairement limité à [open, startDate] : ne pas écraser une saisie manuelle.
  }, [open, startDate])

  const { generated, shortfall } = useMemo(() => {
    const n = Number.parseInt(count, 10) || 0
    const dur = Number.parseInt(duration, 10) || 0
    if (n < 1 || dur < 1 || !startDate) return { generated: [], shortfall: 0 }
    return generateSlotsAcrossDays({
      days,
      startDate,
      startTime,
      duration: dur,
      count: n,
      existingByDate,
    })
  }, [days, startDate, startTime, count, duration, existingByDate])

  // Bornes de la plage événement pour l'aperçu.
  const { open: eventOpen, close: eventClose } = eventTimeWindow(eventRow, days)

  async function doGenerate(): Promise<void> {
    const v = Number.parseInt(maxVolunteers, 10) || 1
    setSaving(true)
    try {
      const ok = await onGenerate(
        generated.map((g) => ({
          stand_id: standId,
          date: g.date,
          start_time: g.start_time,
          end_time: g.end_time,
          max_volunteers: v,
        })),
      )
      if (ok) onOpenChange(false)
    } finally {
      setSaving(false)
      setConfirmOpen(false)
    }
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    setError(null)

    const v = Number.parseInt(maxVolunteers, 10)
    if (Number.isNaN(v) || v < 1) {
      setError('Le nombre de bénévoles doit être au moins 1.')
      return
    }
    if (generated.length === 0) {
      setError('Aucun créneau ne peut être généré dans les plages disponibles.')
      return
    }
    if (shortfall > 0) {
      setConfirmOpen(true)
      return
    }
    void doGenerate()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Générer des créneaux automatiquement</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gen-start-day">Journée de départ</Label>
                <Select value={startDate} onValueChange={setStartDate}>
                  <SelectTrigger id="gen-start-day">
                    <SelectValue placeholder="Choisir une journée" />
                  </SelectTrigger>
                  <SelectContent>
                    {standOpenDays.map((day) => (
                      <SelectItem key={day} value={day} className="capitalize">
                        {formatDayShort(day)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gen-start-time">Heure de début</Label>
                <Input
                  id="gen-start-time"
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gen-count">Nombre</Label>
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
                <Label htmlFor="gen-duration">Durée (min)</Label>
                <Input
                  id="gen-duration"
                  type="number"
                  min={1}
                  required
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gen-volunteers">Bénévoles</Label>
                <Input
                  id="gen-volunteers"
                  type="number"
                  min={1}
                  required
                  value={maxVolunteers}
                  onChange={(e) => setMaxVolunteers(e.target.value)}
                />
              </div>
            </div>

            {/* Aperçu visuel dynamique */}
            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-medium text-slate-700">
                Aperçu — {generated.length} créneau{generated.length > 1 ? 'x' : ''} à créer
                {shortfall > 0 && (
                  <span className="ml-1 text-amber-600">
                    ({shortfall} non plaçable{shortfall > 1 ? 's' : ''})
                  </span>
                )}
              </p>
              <SlotGenerationPreview
                days={days}
                eventOpen={eventOpen}
                eventClose={eventClose}
                existing={existingSlots
                  .filter((s) => s.date)
                  .map((s) => ({
                    date: s.date as string,
                    start_time: s.start_time,
                    end_time: s.end_time,
                  }))}
                generated={generated}
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
        open={confirmOpen}
        title="Tous les créneaux ne tiennent pas"
        description="Tous les créneaux demandés ne peuvent pas être générés dans les plages d'ouverture disponibles de ce stand. Voulez-vous créer uniquement les créneaux possibles ?"
        confirmLabel="Créer les créneaux possibles"
        onConfirm={doGenerate}
        onOpenChange={(o) => {
          if (!o) setConfirmOpen(false)
        }}
      />
    </>
  )
}

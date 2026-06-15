import { DayTimeline, type TimelineBlock } from '@/components/admin/DayTimeline'
import {
  resolveStandDays,
  eventTimeWindow,
  formatTime,
} from '@/lib/date-utils'
import type { EventRow, EventDayScheduleRow, SlotRow, FillRate } from '@/lib/domain'

interface StandSlotsPreviewProps {
  eventRow: EventRow
  daySchedules: EventDayScheduleRow[]
  openDays: string[]
  slots: SlotRow[]
  fillRates: Record<string, FillRate>
}

const LEGEND = [
  { className: 'bg-slate-200', label: "Plage de l'événement" },
  { className: 'bg-emerald-200', label: 'Ouverture du stand' },
  { className: 'bg-sky-200', label: 'Libre' },
  { className: 'bg-amber-300', label: 'Partiel' },
  { className: 'bg-emerald-600', label: 'Complet' },
]

// Couleur d'un créneau selon son remplissage.
function slotClass(current: number, max: number): string {
  if (max > 0 && current >= max) return 'border-emerald-700 bg-emerald-600'
  if (current > 0) return 'border-amber-400 bg-amber-300'
  return 'border-sky-400 bg-sky-200'
}

// Aperçu des créneaux d'un stand, colorés selon leur état de réservation.
export function StandSlotsPreview({
  eventRow,
  daySchedules,
  openDays,
  slots,
  fillRates,
}: StandSlotsPreviewProps) {
  const days = resolveStandDays(eventRow, daySchedules, openDays)
  const { open: eventOpen, close: eventClose } = eventTimeWindow(eventRow, days)

  const blocks: TimelineBlock[] = slots
    .filter((s) => s.date)
    .map((s) => {
      const current = fillRates[s.id]?.currentCount ?? 0
      return {
        date: s.date as string,
        start: s.start_time.slice(0, 5),
        end: s.end_time.slice(0, 5),
        className: slotClass(current, s.max_volunteers),
        title: `${formatTime(s.start_time)} – ${formatTime(s.end_time)} · ${current}/${s.max_volunteers}`,
      }
    })

  return (
    <DayTimeline
      days={days}
      eventOpen={eventOpen}
      eventClose={eventClose}
      blocks={blocks}
      legend={LEGEND}
    />
  )
}

import { DayTimeline, type TimelineBlock } from '@/components/admin/DayTimeline'
import { formatTime, type DayRow, type GeneratedSlot } from '@/lib/date-utils'

interface ExistingBlock {
  date: string
  start_time: string
  end_time: string
}

interface SlotGenerationPreviewProps {
  days: DayRow[]
  eventOpen: string
  eventClose: string
  existing: ExistingBlock[]
  generated: GeneratedSlot[]
}

const LEGEND = [
  { className: 'bg-slate-200', label: "Plage de l'événement" },
  { className: 'bg-emerald-200', label: 'Ouverture du stand' },
  { className: 'bg-orange-300', label: 'Créneaux générés' },
  { className: 'bg-sky-200', label: 'Créneau existant' },
]

// Aperçu de génération : créneaux existants (bleu) + créneaux à générer (orange).
export function SlotGenerationPreview({
  days,
  eventOpen,
  eventClose,
  existing,
  generated,
}: SlotGenerationPreviewProps) {
  const blocks: TimelineBlock[] = [
    ...existing.map((e) => ({
      date: e.date,
      start: e.start_time.slice(0, 5),
      end: e.end_time.slice(0, 5),
      className: 'border-sky-400 bg-sky-200',
      title: `${formatTime(e.start_time)} – ${formatTime(e.end_time)} (existant)`,
    })),
    ...generated.map((g) => ({
      date: g.date,
      start: g.start_time,
      end: g.end_time,
      className: 'border-orange-400 bg-orange-300',
      title: `${g.start_time} – ${g.end_time} (généré)`,
    })),
  ]

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

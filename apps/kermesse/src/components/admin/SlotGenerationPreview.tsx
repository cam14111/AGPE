import { useMemo } from 'react'
import { formatDayShort, formatTime, type OpenDay, type GeneratedSlot } from '@/lib/date-utils'

interface ExistingBlock {
  date: string
  start_time: string
  end_time: string
}

interface SlotGenerationPreviewProps {
  days: OpenDay[] // jours d'ouverture du stand (date, open, close en "HH:MM")
  eventOpen: string // "HH:MM" — borne basse de la plage événement
  eventClose: string // "HH:MM" — borne haute de la plage événement
  existing: ExistingBlock[]
  generated: GeneratedSlot[]
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

// Aperçu visuel : une bande horizontale par journée d'ouverture du stand.
// Gris = plage événement, vert = plage stand, bleu clair = créneaux existants,
// orange clair = créneaux générés.
export function SlotGenerationPreview({
  days,
  eventOpen,
  eventClose,
  existing,
  generated,
}: SlotGenerationPreviewProps) {
  // Axe temporel commun : englobe la plage événement et toutes les plages stand.
  const { axisStart, axisSpan, ticks } = useMemo(() => {
    let min = toMinutes(eventOpen)
    let max = toMinutes(eventClose)
    for (const d of days) {
      min = Math.min(min, toMinutes(d.open))
      max = Math.max(max, toMinutes(d.close))
    }
    const span = Math.max(max - min, 60)
    const tickList: number[] = []
    const startHour = Math.floor(min / 60)
    const endHour = Math.ceil(max / 60)
    for (let h = startHour; h <= endHour; h++) tickList.push(h * 60)
    return { axisStart: min, axisSpan: span, ticks: tickList }
  }, [days, eventOpen, eventClose])

  const pct = (minutes: number): number =>
    ((minutes - axisStart) / axisSpan) * 100

  const block = (start: string, end: string) => ({
    left: `${pct(toMinutes(start))}%`,
    width: `${pct(toMinutes(end)) - pct(toMinutes(start))}%`,
  })

  if (days.length === 0) return null

  return (
    <div className="space-y-2">
      {/* Légende */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
        <Legend className="bg-slate-200" label="Plage de l'événement" />
        <Legend className="bg-emerald-200" label="Ouverture du stand" />
        <Legend className="bg-orange-300" label="Créneaux générés" />
        <Legend className="bg-sky-200" label="Créneau existant" />
      </div>

      {/* Axe horaire */}
      <div className="relative ml-[5.5rem] h-4 text-[10px] text-slate-400">
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute -translate-x-1/2"
            style={{ left: `${pct(t)}%` }}
          >
            {String(Math.floor(t / 60)).padStart(2, '0')}h
          </span>
        ))}
      </div>

      {/* Une bande par journée */}
      <div className="space-y-1.5">
        {days.map((day) => {
          const dayExisting = existing.filter((e) => e.date === day.date)
          const dayGenerated = generated.filter((g) => g.date === day.date)
          return (
            <div key={day.date} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-xs capitalize text-slate-600">
                {formatDayShort(day.date)}
              </span>
              <div className="relative h-7 flex-1 rounded bg-slate-50">
                {/* Plage événement (gris) */}
                <div
                  className="absolute top-0 h-full rounded bg-slate-200"
                  style={block(eventOpen, eventClose)}
                />
                {/* Plage d'ouverture du stand (vert) */}
                <div
                  className="absolute top-0 h-full rounded bg-emerald-200"
                  style={block(day.open, day.close)}
                />
                {/* Créneaux existants (bleu clair) */}
                {dayExisting.map((e, i) => (
                  <div
                    key={`ex-${i}`}
                    className="absolute top-0.5 h-6 rounded-sm border border-sky-400 bg-sky-200"
                    style={block(e.start_time.slice(0, 5), e.end_time.slice(0, 5))}
                    title={`${formatTime(e.start_time)} – ${formatTime(e.end_time)} (existant)`}
                  />
                ))}
                {/* Créneaux générés (orange clair) */}
                {dayGenerated.map((g, i) => (
                  <div
                    key={`gen-${i}`}
                    className="absolute top-0.5 h-6 rounded-sm border border-orange-400 bg-orange-300"
                    style={block(g.start_time, g.end_time)}
                    title={`${g.start_time} – ${g.end_time} (généré)`}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block h-3 w-3 rounded-sm ${className}`} />
      {label}
    </span>
  )
}

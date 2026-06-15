import { useMemo } from 'react'
import { formatDayShort, type DayRow } from '@/lib/date-utils'

export interface TimelineBlock {
  date: string
  start: string // "HH:MM"
  end: string // "HH:MM"
  className: string
  title?: string
}

interface DayTimelineProps {
  days: DayRow[]
  eventOpen: string
  eventClose: string
  blocks: TimelineBlock[]
  legend: { className: string; label: string }[]
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

// Frise temporelle : une bande horizontale par journée, axe horaire commun.
// Gris = plage événement, vert clair = ouverture du stand, blocs colorés = créneaux.
export function DayTimeline({
  days,
  eventOpen,
  eventClose,
  blocks,
  legend,
}: DayTimelineProps) {
  const { axisStart, axisSpan, ticks } = useMemo(() => {
    let min = toMinutes(eventOpen)
    let max = toMinutes(eventClose)
    for (const d of days) {
      if (d.eventOpen) min = Math.min(min, toMinutes(d.eventOpen))
      if (d.eventClose) max = Math.max(max, toMinutes(d.eventClose))
      if (d.open) min = Math.min(min, toMinutes(d.open))
      if (d.close) max = Math.max(max, toMinutes(d.close))
    }
    const span = Math.max(max - min, 60)
    const tickList: number[] = []
    // Ticks par pas de 30 min, strictement dans [min, max] (pas de débordement).
    const STEP = 30
    for (let t = Math.ceil(min / STEP) * STEP; t <= Math.floor(max / STEP) * STEP; t += STEP) {
      tickList.push(t)
    }
    return { axisStart: min, axisSpan: span, ticks: tickList }
  }, [days, eventOpen, eventClose])

  const pct = (minutes: number): number =>
    ((minutes - axisStart) / axisSpan) * 100

  const style = (start: string, end: string) => ({
    left: `${pct(toMinutes(start))}%`,
    width: `${pct(toMinutes(end)) - pct(toMinutes(start))}%`,
  })

  if (days.length === 0) return null

  return (
    <div className="space-y-2">
      {/* Légende */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
        {legend.map((l) => (
          <span key={l.label} className="flex items-center gap-1">
            <span className={`inline-block h-3 w-3 rounded-sm ${l.className}`} />
            {l.label}
          </span>
        ))}
      </div>

      {/* Axe horaire */}
      <div className="relative ml-[5.5rem] h-4 text-[10px] text-slate-400">
        {ticks.map((t) => {
          const p = pct(t)
          // Aligne les ticks de bord pour qu'ils restent dans la carte.
          const transform =
            p <= 0.01
              ? 'translate-x-0'
              : p >= 99.99
                ? '-translate-x-full'
                : '-translate-x-1/2'
          const h = Math.floor(t / 60)
          const m = t % 60
          return (
            <span
              key={t}
              className={`absolute ${transform}`}
              style={{ left: `${p}%` }}
            >
              {m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`}
            </span>
          )
        })}
      </div>

      {/* Une bande par journée */}
      <div className="space-y-1.5">
        {days.map((day) => (
          <div key={day.date} className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs capitalize text-slate-600">
              {formatDayShort(day.date)}
            </span>
            <div className="relative h-7 flex-1 rounded bg-slate-50">
              {day.eventOpen && day.eventClose && (
                <div
                  className="absolute top-0 h-full rounded bg-slate-200"
                  style={style(day.eventOpen, day.eventClose)}
                />
              )}
              {day.open && day.close && (
                <div
                  className="absolute top-0 h-full rounded bg-emerald-200"
                  style={style(day.open, day.close)}
                />
              )}
              {blocks
                .filter((b) => b.date === day.date)
                .map((b, i) => (
                  <div
                    key={i}
                    className={`absolute top-0.5 h-6 rounded-sm border ${b.className}`}
                    style={style(b.start, b.end)}
                    title={b.title}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

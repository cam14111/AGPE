import { useMemo } from 'react'
import { formatDayShort, type OpenDay } from '@/lib/date-utils'

export interface TimelineBlock {
  date: string
  start: string // "HH:MM"
  end: string // "HH:MM"
  className: string
  title?: string
}

interface DayTimelineProps {
  days: OpenDay[]
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
      min = Math.min(min, toMinutes(d.open))
      max = Math.max(max, toMinutes(d.close))
    }
    const span = Math.max(max - min, 60)
    const tickList: number[] = []
    for (let h = Math.floor(min / 60); h <= Math.ceil(max / 60); h++) {
      tickList.push(h * 60)
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
        {days.map((day) => (
          <div key={day.date} className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs capitalize text-slate-600">
              {formatDayShort(day.date)}
            </span>
            <div className="relative h-7 flex-1 rounded bg-slate-50">
              <div
                className="absolute top-0 h-full rounded bg-slate-200"
                style={style(eventOpen, eventClose)}
              />
              <div
                className="absolute top-0 h-full rounded bg-emerald-200"
                style={style(day.open, day.close)}
              />
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

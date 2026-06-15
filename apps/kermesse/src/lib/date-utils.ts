// Utilitaires de dates — comparaisons et formatage français.
import type { EventRow, EventDayScheduleRow } from '@/lib/domain'

// Vrai si la date (YYYY-MM-DD) est strictement passée (avant aujourd'hui, fuseau local).
export function isEventPast(eventDate: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const parts = eventDate.split('-').map(Number)
  const year = parts[0]
  const month = parts[1]
  const day = parts[2]
  if (year === undefined || month === undefined || day === undefined) {
    return false
  }
  const target = new Date(year, month - 1, day)
  target.setHours(0, 0, 0, 0)

  return target.getTime() < today.getTime()
}

// Formate une date ISO (YYYY-MM-DD) en français lisible : "samedi 14 juin 2026".
export function formatEventDate(eventDate: string): string {
  const parts = eventDate.split('-').map(Number)
  const year = parts[0]
  const month = parts[1]
  const day = parts[2]
  if (year === undefined || month === undefined || day === undefined) {
    return eventDate
  }
  const date = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

// Formate une plage de dates en français.
// Même jour → "samedi 14 juin 2026".
// Même mois  → "12 – 14 juillet 2026".
// Mois diff  → "30 juin – 2 juillet 2026".
export function formatEventDateRange(startDate: string, endDate: string): string {
  if (startDate === endDate) return formatEventDate(startDate)

  const parseDate = (d: string) => {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y!, m! - 1, day!)
  }

  const start = parseDate(startDate)
  const end = parseDate(endDate)
  const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const fmtNoYear = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} – ${fmt.format(end)}`
  }
  return `${fmtNoYear.format(start)} – ${fmt.format(end)}`
}

// Tronque une heure SQL "HH:MM:SS" en "HH:MM".
export function formatTime(time: string | null): string {
  if (!time) return ''
  return time.slice(0, 5)
}

// Formate un timestamp ISO en date + heure française : "14/06/2026 à 21:30".
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

// Vrai si deux intervalles horaires se chevauchent (comparaison lexicale des
// heures "HH:MM[:SS]"). Les créneaux adjacents ne se chevauchent pas (a.end == b.start).
export function timesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && aEnd > bStart
}

// Vrai si la date est dans la plage [start, end] inclus (comparaison lexicale YYYY-MM-DD).
export function isDateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

// Retourne tous les YYYY-MM-DD entre startDate et endDate inclus.
export function getEventDays(startDate: string, endDate: string): string[] {
  const days: string[] = []
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)
  const current = new Date(sy!, sm! - 1, sd!)
  const last = new Date(ey!, em! - 1, ed!)
  while (current <= last) {
    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, '0')
    const d = String(current.getDate()).padStart(2, '0')
    days.push(`${y}-${m}-${d}`)
    current.setDate(current.getDate() + 1)
  }
  return days
}

// Retourne l'heure d'ouverture applicable à une journée (règle de priorité :
// horaire personnalisé > horaire par défaut de l'événement).
export function resolveOpenTime(
  event: EventRow,
  schedules: EventDayScheduleRow[],
  date: string,
): string | null {
  const custom = schedules.find((s) => s.date === date)
  return custom?.open_time?.slice(0, 5) ?? event.start_time?.slice(0, 5) ?? null
}

// Retourne l'heure de fermeture applicable à une journée.
export function resolveCloseTime(
  event: EventRow,
  schedules: EventDayScheduleRow[],
  date: string,
): string | null {
  const custom = schedules.find((s) => s.date === date)
  return custom?.close_time?.slice(0, 5) ?? event.end_time?.slice(0, 5) ?? null
}

// Ajoute N minutes à une heure "HH:MM" et retourne "HH:MM".
export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = (h! * 60 + m!) + minutes
  const hh = Math.floor(total / 60) % 24
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

// Génère des intervalles de créneaux de `duration` minutes à partir de `openTime`.
// S'arrête quand on atteint `count` créneaux ou que closeTime est dépassé.
// Retourne à la fois les intervalles valides et ceux qui dépassent closeTime.
export function generateSlotIntervals(
  openTime: string,
  closeTime: string | null,
  duration: number,
  count: number,
): { slots: Array<{ start_time: string; end_time: string }>; overflow: boolean } {
  const result: Array<{ start_time: string; end_time: string }> = []
  let overflow = false
  let current = openTime

  for (let i = 0; i < count; i++) {
    const next = addMinutes(current, duration)
    if (closeTime && next > closeTime) {
      overflow = true
    }
    result.push({ start_time: current, end_time: next })
    current = next
  }

  return { slots: result, overflow }
}

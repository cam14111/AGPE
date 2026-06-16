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

// Vrai si la date + heure (YYYY-MM-DD, HH:MM[:SS]) est strictement passée
// (comparaison à l'instant présent, fuseau local).
export function isDateTimePast(date: string, time: string): boolean {
  if (!date) return false
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  if (y === undefined || m === undefined || d === undefined) return false
  const end = new Date(y, m - 1, d, hh ?? 0, mm ?? 0, 0, 0)
  return end.getTime() < Date.now()
}

// Formate une date ISO (YYYY-MM-DD) en libellé court : "samedi 27".
export function formatDayShort(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  if (y === undefined || m === undefined || d === undefined) return date
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
  }).format(new Date(y, m - 1, d))
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

// Formate un timestamp ISO (UTC) en "dd/mm/yyyy hh:mm" à l'heure légale
// française (fuseau Europe/Paris, gestion automatique hiver UTC+1 / été UTC+2).
// Indépendant du fuseau de la machine grâce à l'option timeZone.
export function formatTimestampParis(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`
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

interface TimeRange {
  start_time: string
  end_time: string
}

// Calcule les plages libres d'une journée entre [open, close] (format "HH:MM"),
// en excluant les créneaux existants. Les heures existantes sont normalisées en
// "HH:MM" et bornées à la fenêtre d'ouverture.
export function computeFreeIntervals(
  open: string,
  close: string,
  existing: TimeRange[],
): Array<{ start: string; end: string }> {
  const sorted = existing
    .map((e) => ({ start: e.start_time.slice(0, 5), end: e.end_time.slice(0, 5) }))
    .filter((e) => e.end > open && e.start < close)
    .sort((a, b) => a.start.localeCompare(b.start))

  const free: Array<{ start: string; end: string }> = []
  let cursor = open
  for (const e of sorted) {
    const es = e.start < open ? open : e.start
    const ee = e.end > close ? close : e.end
    if (es > cursor) free.push({ start: cursor, end: es })
    if (ee > cursor) cursor = ee
  }
  if (cursor < close) free.push({ start: cursor, end: close })
  return free
}

// Première heure de début libre >= `from` (ou l'ouverture) où un créneau de
// `duration` minutes tient dans une plage libre. `duration` = 0 pour ignorer la
// contrainte de durée (préremplissage simple). Retourne null si rien ne tient.
export function firstFreeStart(
  open: string,
  close: string,
  duration: number,
  existing: TimeRange[],
  from?: string,
): string | null {
  const lower = from && from > open ? from : open
  for (const itv of computeFreeIntervals(open, close, existing)) {
    const start = itv.start < lower ? lower : itv.start
    if (start >= itv.end) continue
    if (addMinutes(start, duration) <= itv.end) return start
  }
  return null
}

export interface OpenDay {
  date: string
  open: string
  close: string
}

// Journée d'aperçu : horaires de l'événement ce jour-là (gris, toujours), et
// horaires d'ouverture du stand (vert, seulement si le stand est ouvert).
export interface DayRow {
  date: string
  eventOpen: string
  eventClose: string
  open?: string
  close?: string
}

// Construit les journées d'ouverture d'un stand avec leurs horaires applicables.
export function resolveStandDays(
  event: EventRow,
  schedules: EventDayScheduleRow[],
  openDays: string[],
): OpenDay[] {
  return openDays
    .map((date) => ({
      date,
      open: resolveOpenTime(event, schedules, date) ?? '',
      close: resolveCloseTime(event, schedules, date) ?? '',
    }))
    .filter((d) => d.open && d.close && d.close > d.open)
}

// Tous les jours de l'événement, avec horaires d'ouverture renseignés seulement
// pour les jours où le stand est ouvert (les autres restent en gris dans l'aperçu).
export function resolveEventDaysForStand(
  event: EventRow,
  schedules: EventDayScheduleRow[],
  openDays: string[],
): DayRow[] {
  return getEventDays(event.start_date, event.end_date).map((date) => {
    const eventOpen = resolveOpenTime(event, schedules, date) ?? ''
    const eventClose = resolveCloseTime(event, schedules, date) ?? ''
    const isOpen =
      openDays.includes(date) && !!eventOpen && !!eventClose && eventClose > eventOpen
    return isOpen
      ? { date, eventOpen, eventClose, open: eventOpen, close: eventClose }
      : { date, eventOpen, eventClose }
  })
}

// Fenêtre horaire globale pour l'axe : la plus large des plages (événement + jours).
export function eventTimeWindow(
  event: EventRow,
  days: DayRow[],
): { open: string; close: string } {
  let open = formatTime(event.start_time) || ''
  let close = formatTime(event.end_time) || ''
  for (const d of days) {
    if (d.eventOpen && (!open || d.eventOpen < open)) open = d.eventOpen
    if (d.eventClose && (!close || d.eventClose > close)) close = d.eventClose
  }
  return { open: open || '08:00', close: close || '20:00' }
}

export interface GeneratedSlot {
  date: string
  start_time: string
  end_time: string
}

// Répartit dynamiquement `count` créneaux de `duration` minutes sur les journées
// d'ouverture du stand, dans l'ordre chronologique, à partir de (startDate,
// startTime). Contourne les créneaux existants (reprend après eux) et passe
// automatiquement à la journée suivante. `shortfall` = créneaux non placés.
export function generateSlotsAcrossDays(params: {
  days: OpenDay[]
  startDate: string
  startTime: string
  duration: number
  count: number
  existingByDate: Map<string, TimeRange[]>
}): { generated: GeneratedSlot[]; shortfall: number } {
  const { days, startDate, startTime, duration, count, existingByDate } = params
  const generated: GeneratedSlot[] = []

  const orderedDays = [...days]
    .filter((d) => d.date >= startDate)
    .sort((a, b) => a.date.localeCompare(b.date))

  for (const day of orderedDays) {
    if (generated.length >= count) break
    const lower =
      day.date === startDate && startTime && startTime > day.open
        ? startTime
        : day.open
    const existing = existingByDate.get(day.date) ?? []

    for (const itv of computeFreeIntervals(day.open, day.close, existing)) {
      if (generated.length >= count) break
      let cursor = itv.start < lower ? lower : itv.start
      while (generated.length < count && addMinutes(cursor, duration) <= itv.end) {
        const end = addMinutes(cursor, duration)
        generated.push({ date: day.date, start_time: cursor, end_time: end })
        cursor = end
      }
    }
  }

  return { generated, shortfall: count - generated.length }
}

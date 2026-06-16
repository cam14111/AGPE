// Logique « temps réel » de la supervision des stands (fonctions pures).
import { formatTime } from '@/lib/date-utils'
import { participantLabel } from '@/lib/participant'
import type { SlotRow } from '@/lib/domain'
import type { AdminSignupDetail } from '@/hooks/useAdminSignups'

export interface NowParts {
  date: string // YYYY-MM-DD (heure locale)
  time: string // HH:MM:SS (heure locale)
}

// Décompose l'instant courant en chaînes comparables aux colonnes SQL
// (date `YYYY-MM-DD`, heure `HH:MM:SS`), en heure locale.
export function nowParts(now: Date): NowParts {
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
  }
}

export type LiveState =
  | 'in-progress' // un créneau est en cours, avec au moins un inscrit réservé
  | 'no-current-signup' // un créneau est en cours mais personne n'est inscrit
  | 'idle' // aucun créneau en cours (avant le 1er, entre deux, ou journée finie)
  | 'closed-today' // aucun créneau ce jour pour ce stand

export interface LivePerson {
  label: string
  until: string // heure réelle de fin (HH:MM) après fusion des créneaux consécutifs
}

export interface LiveNext {
  from: string // HH:MM
  people: string[]
}

export interface LivePresenceLine {
  until: string // HH:MM : heure réelle de fin partagée
  labels: string[] // bénévoles présents jusqu'à cette heure
}

// Regroupe les présents par heure réelle de fin, dans leur ordre d'apparition.
// Évite de répéter une ligne par bénévole quand plusieurs finissent en même temps.
export function groupPresenceByUntil(people: LivePerson[]): LivePresenceLine[] {
  const lines: LivePresenceLine[] = []
  for (const p of people) {
    const existing = lines.find((l) => l.until === p.until)
    if (existing) existing.labels.push(p.label)
    else lines.push({ until: p.until, labels: [p.label] })
  }
  return lines
}

export interface StandLive {
  state: LiveState
  current: LivePerson[]
  next: LiveNext | null
  currentSlot: { start: string; end: string } | null // HH:MM
  currentFilled: number // réservés présents sur le créneau courant (0 si personne)
  currentCapacity: number // max_volunteers du créneau courant (0 si aucun créneau)
}

// Inscrits « réservés » (présents) d'un créneau, dans l'ordre fourni par la RPC.
function reservedFor(
  map: Map<string, AdminSignupDetail[]>,
  slotId: string,
): AdminSignupDetail[] {
  return (map.get(slotId) ?? []).filter((p) => p.status === 'reserved')
}

// Premier créneau à venir (à partir de `fromIdx` exclu) introduisant une
// personne réservée absente de `currentUserIds`. Sert à déterminer la relève.
function findNext(
  daySlots: SlotRow[],
  fromIdx: number,
  currentUserIds: Set<string>,
  map: Map<string, AdminSignupDetail[]>,
): LiveNext | null {
  for (let i = fromIdx + 1; i < daySlots.length; i++) {
    const s = daySlots[i]
    if (!s) continue
    const reserved = reservedFor(map, s.id)
    const hasNew = reserved.some((p) => !currentUserIds.has(p.user_id))
    if (reserved.length > 0 && hasNew) {
      return {
        from: formatTime(s.start_time),
        people: reserved.map(participantLabel),
      }
    }
  }
  return null
}

// Calcule l'état temps réel d'un stand à l'instant `now`, à partir de ses
// créneaux et des inscrits indexés par créneau. Fusionne les créneaux
// consécutifs d'une même personne pour donner l'heure réelle de relève.
export function computeStandLive(
  slots: SlotRow[],
  participantsBySlot: Map<string, AdminSignupDetail[]>,
  now: NowParts,
): StandLive {
  const daySlots = slots
    .filter((s) => (s.date ?? '') === now.date)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  if (daySlots.length === 0) {
    return {
      state: 'closed-today',
      current: [],
      next: null,
      currentSlot: null,
      currentFilled: 0,
      currentCapacity: 0,
    }
  }

  const currentIdx = daySlots.findIndex(
    (s) => s.start_time <= now.time && now.time < s.end_time,
  )

  // Aucun créneau en cours : relève = 1er créneau à venir avec un réservé.
  if (currentIdx === -1) {
    const next = findNext(daySlots, -1, new Set(), participantsBySlot)
    return {
      state: 'idle',
      current: [],
      next,
      currentSlot: null,
      currentFilled: 0,
      currentCapacity: 0,
    }
  }

  const currentSlot = daySlots[currentIdx]
  if (!currentSlot) {
    return {
      state: 'idle',
      current: [],
      next: null,
      currentSlot: null,
      currentFilled: 0,
      currentCapacity: 0,
    }
  }
  const slotTimes = {
    start: formatTime(currentSlot.start_time),
    end: formatTime(currentSlot.end_time),
  }
  const currentReserved = reservedFor(participantsBySlot, currentSlot.id)

  // Créneau en cours sans personne inscrite.
  if (currentReserved.length === 0) {
    const next = findNext(daySlots, currentIdx, new Set(), participantsBySlot)
    return {
      state: 'no-current-signup',
      current: [],
      next,
      currentSlot: slotTimes,
      currentFilled: 0,
      currentCapacity: currentSlot.max_volunteers,
    }
  }

  // Pour chaque présent, étendre la fin tant que les créneaux suivants sont
  // consécutifs et le gardent réservé.
  const current: LivePerson[] = currentReserved.map((p) => {
    let until = currentSlot.end_time
    for (let i = currentIdx + 1; i < daySlots.length; i++) {
      const s = daySlots[i]
      if (!s || s.start_time !== until) break
      const stillThere = reservedFor(participantsBySlot, s.id).some(
        (x) => x.user_id === p.user_id,
      )
      if (!stillThere) break
      until = s.end_time
    }
    return { label: participantLabel(p), until: formatTime(until) }
  })

  const currentUserIds = new Set(currentReserved.map((p) => p.user_id))
  const next = findNext(daySlots, currentIdx, currentUserIds, participantsBySlot)

  return {
    state: 'in-progress',
    current,
    next,
    currentSlot: slotTimes,
    currentFilled: currentReserved.length,
    currentCapacity: currentSlot.max_volunteers,
  }
}

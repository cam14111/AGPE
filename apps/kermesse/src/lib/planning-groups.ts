// Regroupement des créneaux consécutifs d'un bénévole pour « Mon planning ».
import type { SignupStatus } from '@/lib/domain'
import type { MySignup } from '@/hooks/useMySignups'

export interface PlanningGroup {
  key: string // eventId|standId|slotDate|startTime
  eventId: string
  eventName: string
  eventDate: string
  eventEndDate: string
  standName: string
  standEmoji: string | null
  slotDate: string
  startTime: string // début du 1er créneau du groupe
  endTime: string // fin du dernier créneau du groupe
  status: SignupStatus
  slotIds: string[] // tous les créneaux du groupe (désinscription en bloc)
}

// Fusionne les créneaux réellement consécutifs (même événement, même stand, même
// jour, même statut, et fin == début du suivant). Les créneaux séparés par une
// coupure, de stands ou d'événements différents restent distincts.
export function groupConsecutiveSignups(signups: MySignup[]): PlanningGroup[] {
  // 1. Regrouper par (événement, stand, jour, statut).
  const buckets = new Map<string, MySignup[]>()
  for (const s of signups) {
    const bucketKey = `${s.eventId}|${s.standId}|${s.slotDate}|${s.status}`
    const list = buckets.get(bucketKey) ?? []
    list.push(s)
    buckets.set(bucketKey, list)
  }

  // 2. Dans chaque bucket, trier par heure de début et fusionner les runs
  //    contigus (fin d'un créneau == début du suivant).
  const groups: PlanningGroup[] = []
  for (const list of buckets.values()) {
    const sorted = [...list].sort((a, b) => a.startTime.localeCompare(b.startTime))
    let run: MySignup[] = []

    const flush = () => {
      if (run.length === 0) return
      const first = run[0]!
      const last = run[run.length - 1]!
      groups.push({
        key: `${first.eventId}|${first.standId}|${first.slotDate}|${first.startTime}`,
        eventId: first.eventId,
        eventName: first.eventName,
        eventDate: first.eventDate,
        eventEndDate: first.eventEndDate,
        standName: first.standName,
        standEmoji: first.standEmoji,
        slotDate: first.slotDate,
        startTime: first.startTime,
        endTime: last.endTime,
        status: first.status,
        slotIds: run.map((r) => r.slotId),
      })
      run = []
    }

    for (const s of sorted) {
      const prev = run[run.length - 1]
      if (prev && prev.endTime !== s.startTime) flush()
      run.push(s)
    }
    flush()
  }

  // 3. Ordre chronologique d'affichage : événement → jour → heure → stand.
  groups.sort(
    (a, b) =>
      a.eventDate.localeCompare(b.eventDate) ||
      a.slotDate.localeCompare(b.slotDate) ||
      a.startTime.localeCompare(b.startTime) ||
      a.standName.localeCompare(b.standName),
  )

  return groups
}

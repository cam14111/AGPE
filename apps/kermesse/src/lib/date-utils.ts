// Utilitaires de dates — comparaisons et formatage français.

// Vrai si la date de l'événement (YYYY-MM-DD) est strictement passée
// (avant aujourd'hui, comparaison au jour près, fuseau local).
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
// heures "HH:MM[:SS]", valides car même format). Les créneaux adjacents ne se
// chevauchent pas (a.end == b.start est autorisé).
export function timesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && aEnd > bStart
}

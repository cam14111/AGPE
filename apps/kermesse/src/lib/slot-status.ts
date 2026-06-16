// Code couleur partagé des créneaux de supervision (récapitulatif + temps réel).
export type SlotStatus = 'past' | 'full' | 'partial' | 'empty'

// Priorité : passé > complet > incomplet > vide.
export function slotStatus(opts: {
  isPast: boolean
  filled: number
  capacity: number
}): SlotStatus {
  if (opts.isPast) return 'past'
  if (opts.capacity > 0 && opts.filled >= opts.capacity) return 'full'
  if (opts.filled > 0) return 'partial'
  return 'empty'
}

// Fond + bordure légers (cohérents avec les tons déjà utilisés : red-50, amber, emerald).
export const SLOT_STATUS_CLASSES: Record<SlotStatus, string> = {
  past: 'border-slate-200 bg-slate-50',
  full: 'border-emerald-200 bg-emerald-50',
  partial: 'border-amber-200 bg-amber-50',
  empty: 'border-red-200 bg-red-50',
}

// Libellé textuel (accessibilité : ne pas reposer uniquement sur la couleur).
export const SLOT_STATUS_LABELS: Record<SlotStatus, string> = {
  past: 'Passé',
  full: 'Complet',
  partial: 'Incomplet',
  empty: 'Aucun inscrit',
}

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { participantLabel } from '@/lib/participant'
import type { AdminSignupDetail } from '@/hooks/useAdminSignups'

interface ParticipantChipProps {
  detail: AdminSignupDetail
  onRemove: () => void
}

// Puce d'un inscrit (réservé / remplaçant) avec bouton de désinscription.
export function ParticipantChip({ detail, onRemove }: ParticipantChipProps) {
  const isReplacement = detail.status === 'replacement'
  const label = participantLabel(detail)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
        isReplacement
          ? 'bg-amber-100 text-amber-700'
          : 'bg-slate-100 text-slate-700',
      )}
    >
      {label}
      {isReplacement && <span className="opacity-70">· rempl.</span>}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Désinscrire ${label}`}
        className="rounded-full p-0.5 opacity-60 hover:bg-red-100 hover:text-red-600 hover:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

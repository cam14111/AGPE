import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SlotBadge } from '@/components/volunteer/SlotBadge'
import { formatTime } from '@/lib/date-utils'
import type { SignupStatus, SlotRow as SlotRowType } from '@/lib/domain'

interface SlotRowProps {
  slot: SlotRowType
  currentCount: number
  replacementCount: number
  myStatus: SignupStatus | undefined
  overlaps: boolean
  isPastEvent: boolean
  onSignup: (slotId: string) => Promise<void>
  onUnsignup: (slotId: string) => Promise<void>
}

// Une ligne de créneau : horaire | badge | statut/inscription.
export function SlotRow({
  slot,
  currentCount,
  replacementCount,
  myStatus,
  overlaps,
  isPastEvent,
  onSignup,
  onUnsignup,
}: SlotRowProps) {
  const [loading, setLoading] = useState(false)
  const isSignedUp = myStatus !== undefined
  const isFull = currentCount >= slot.max_volunteers

  async function handleClick(): Promise<void> {
    setLoading(true)
    try {
      if (isSignedUp) {
        await onUnsignup(slot.id)
      } else {
        await onSignup(slot.id)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-800">
          {formatTime(slot.start_time)} → {formatTime(slot.end_time)}
        </span>
        <SlotBadge current={currentCount} max={slot.max_volunteers} />
        <span className="text-xs text-slate-400">
          {currentCount} / {slot.max_volunteers}
        </span>
        {replacementCount > 0 && (
          <span className="text-xs text-slate-400">
            · {replacementCount} en attente
          </span>
        )}
        {myStatus === 'reserved' && (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
            Réservé ✓
          </Badge>
        )}
        {myStatus === 'replacement' && (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            Remplaçant
          </Badge>
        )}
      </div>

      {isSignedUp ? (
        // Masqué (pas seulement désactivé) après la date de la kermesse.
        !isPastEvent && (
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => void handleClick()}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Désinscription…' : 'Se désinscrire'}
          </Button>
        )
      ) : overlaps && !isPastEvent ? (
        <span className="text-xs text-slate-400 sm:text-right">
          Chevauche un de vos créneaux
        </span>
      ) : (
        <Button
          className="w-full sm:w-auto"
          variant={isFull ? 'outline' : 'default'}
          onClick={() => void handleClick()}
          disabled={loading || isPastEvent}
          aria-busy={loading}
        >
          {loading
            ? 'Inscription…'
            : isFull
              ? 'Se positionner remplaçant'
              : "S'inscrire"}
        </Button>
      )}

      {isSignedUp && isPastEvent && (
        <span className="text-xs font-medium text-emerald-600">
          {myStatus === 'replacement' ? 'Remplaçant' : 'Inscrit ✓'}
        </span>
      )}
    </div>
  )
}

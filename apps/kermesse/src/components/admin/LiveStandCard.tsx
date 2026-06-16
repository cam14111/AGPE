import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { computeStandLive, groupPresenceByUntil, type NowParts } from '@/lib/live-board'
import { slotStatus, SLOT_STATUS_CLASSES } from '@/lib/slot-status'
import type { StandWithSlots } from '@/lib/domain'
import type { AdminSignupDetail } from '@/hooks/useAdminSignups'

interface LiveStandCardProps {
  stand: StandWithSlots
  participantsBySlot: Map<string, AdminSignupDetail[]>
  now: NowParts
}

// Carte temps réel d'un stand : qui tient le stand maintenant (jusqu'à quand,
// créneaux consécutifs fusionnés) et qui prend la suite.
export function LiveStandCard({ stand, participantsBySlot, now }: LiveStandCardProps) {
  const live = computeStandLive(stand.kermesse_slots, participantsBySlot, now)
  // Code couleur uniquement quand un créneau est en cours (sinon affichage neutre).
  const status =
    live.state === 'in-progress' || live.state === 'no-current-signup'
      ? slotStatus({
          isPast: false,
          filled: live.currentFilled,
          capacity: live.currentCapacity,
        })
      : null

  return (
    <Card className={cn(status && SLOT_STATUS_CLASSES[status])}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <span aria-hidden="true">{stand.emoji ?? '🎪'}</span>
          {stand.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {live.state === 'in-progress' && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              {live.currentFilled >= live.currentCapacity
                ? 'Actuellement complet'
                : `Actuellement ${live.currentFilled} bénévole${
                    live.currentFilled > 1 ? 's' : ''
                  } sur ${live.currentCapacity}`}
            </p>
            <ul className="mt-0.5 space-y-0.5">
              {groupPresenceByUntil(live.current).map((line, i) => (
                <li key={i} className="font-medium text-slate-900">
                  {line.labels.join(', ')}
                  <span className="font-normal text-slate-500">
                    {' '}
                    — {line.labels.length > 1 ? 'présents' : 'présent'} jusqu'à{' '}
                    {line.until}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {live.state === 'no-current-signup' && (
          <p className="font-medium text-red-700">
            Personne sur le stand actuellement
            {live.currentSlot && (
              <span className="font-normal">
                {' '}
                (créneau {live.currentSlot.start} → {live.currentSlot.end})
              </span>
            )}
          </p>
        )}

        {live.state === 'idle' && (
          <p className="text-slate-500">Aucun créneau en cours.</p>
        )}

        {live.state === 'closed-today' && (
          <p className="text-slate-500">Stand fermé aujourd'hui.</p>
        )}

        {live.next ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Suivant</p>
            <p className="mt-0.5 text-slate-900">
              <span className="font-medium">{live.next.people.join(', ')}</span>
              <span className="text-slate-500">
                {' '}
                — à partir de {live.next.from}
              </span>
            </p>
          </div>
        ) : (
          live.state !== 'closed-today' && (
            <p className="text-xs text-slate-400">Aucune relève prévue ensuite.</p>
          )
        )}
      </CardContent>
    </Card>
  )
}

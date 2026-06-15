import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { SlotRow } from '@/components/volunteer/SlotRow'
import type {
  FillRate,
  SignupStatus,
  SlotRow as SlotRowType,
  StandWithSlots,
} from '@/lib/domain'

interface StandCardProps {
  stand: StandWithSlots
  fillRates: Record<string, FillRate>
  statusBySlot: Map<string, SignupStatus>
  overlapsSlot: (slot: SlotRowType) => boolean
  isPastEvent: boolean
  onSignup: (slotId: string) => Promise<void>
  onUnsignup: (slotId: string) => Promise<void>
}

// Carte d'un stand : en-tête (emoji + nom + lieu), description, liste des créneaux.
export function StandCard({
  stand,
  fillRates,
  statusBySlot,
  overlapsSlot,
  isPastEvent,
  onSignup,
  onUnsignup,
}: StandCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="text-3xl leading-none" aria-hidden="true">
            {stand.emoji ?? '🎪'}
          </span>
          <div>
            <CardTitle className="text-base">{stand.name}</CardTitle>
            {stand.location_detail && (
              <p className="text-xs text-slate-400 mt-0.5">
                {stand.location_detail}
              </p>
            )}
          </div>
        </div>
        {stand.description && (
          <p className="text-sm text-slate-600 pt-1">{stand.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {stand.kermesse_slots.length === 0 ? (
          <p className="text-sm text-slate-400">
            Aucun créneau pour ce stand pour le moment.
          </p>
        ) : (
          stand.kermesse_slots.map((slot) => {
            const fill = fillRates[slot.id]
            return (
              <SlotRow
                key={slot.id}
                slot={slot}
                currentCount={fill?.currentCount ?? 0}
                replacementCount={fill?.replacementCount ?? 0}
                myStatus={statusBySlot.get(slot.id)}
                overlaps={overlapsSlot(slot)}
                isPastEvent={isPastEvent}
                onSignup={onSignup}
                onUnsignup={onUnsignup}
              />
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

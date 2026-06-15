import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SlotRow } from '@/components/volunteer/SlotRow'
import { cn } from '@/lib/utils'
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

// Carte d'un stand, pliable : l'en-tête est toujours visible, les créneaux
// n'apparaissent qu'au clic (utile quand il y a beaucoup de stands).
export function StandCard({
  stand,
  fillRates,
  statusBySlot,
  overlapsSlot,
  isPastEvent,
  onSignup,
  onUnsignup,
}: StandCardProps) {
  const [expanded, setExpanded] = useState(false)

  const slots = stand.kermesse_slots
  const multiDay = new Set(slots.map((s) => s.date)).size > 1

  // Résumé affiché dans l'en-tête (état replié).
  const mySignups = slots.filter((s) => statusBySlot.has(s.id)).length
  const available = slots.filter(
    (s) => (fillRates[s.id]?.currentCount ?? 0) < s.max_volunteers,
  ).length

  return (
    <Card>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full text-left"
      >
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div className="flex items-start gap-3">
            <span className="text-3xl leading-none" aria-hidden="true">
              {stand.emoji ?? '🎪'}
            </span>
            <div>
              <CardTitle className="text-base">{stand.name}</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                {slots.length === 0
                  ? 'Aucun créneau'
                  : `${slots.length} créneau${slots.length > 1 ? 'x' : ''} · ${available} avec place`}
                {stand.location_detail ? ` · ${stand.location_detail}` : ''}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {mySignups > 0 && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                Inscrit · {mySignups}
              </Badge>
            )}
            <ChevronDown
              className={cn(
                'h-5 w-5 text-slate-400 transition-transform',
                expanded && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </div>
        </CardHeader>
      </button>

      {expanded && (
        <CardContent className="space-y-2">
          {stand.description && (
            <p className="pb-1 text-sm text-slate-600">{stand.description}</p>
          )}
          {slots.length === 0 ? (
            <p className="text-sm text-slate-400">
              Aucun créneau pour ce stand pour le moment.
            </p>
          ) : (
            slots.map((slot) => {
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
                  showDate={multiDay}
                  onSignup={onSignup}
                  onUnsignup={onUnsignup}
                />
              )
            })
          )}
        </CardContent>
      )}
    </Card>
  )
}

import { useAuth } from '@agpe/shared/auth/useAuth'
import { useActiveEvent } from '@/hooks/useActiveEvent'
import { useStands } from '@/hooks/useStands'
import { useFillRates } from '@/hooks/useFillRates'
import { useMySignups } from '@/hooks/useMySignups'
import { useSignups } from '@/hooks/useSignups'
import { StandCard } from '@/components/volunteer/StandCard'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import {
  formatEventDate,
  formatTime,
  isEventPast,
  timesOverlap,
} from '@/lib/date-utils'
import type { SlotRow } from '@/lib/domain'

export function StandsList() {
  const { user } = useAuth()
  const { event, loading: eventLoading, error: eventError, refetch: refetchEvent } =
    useActiveEvent()
  const eventId = event?.id ?? null
  const { stands, loading: standsLoading, error: standsError, refetch: refetchStands } =
    useStands(eventId)
  const { fillRates, refetch: refetchFillRates } = useFillRates()
  const {
    signups: mySignups,
    statusBySlot,
    refetch: refetchMySignups,
  } = useMySignups(user?.id ?? null)
  const { signUp, unsignUp } = useSignups()

  // Un créneau chevauche-t-il un autre créneau déjà choisi par l'utilisateur ?
  function overlapsSlot(slot: SlotRow): boolean {
    return mySignups.some(
      (s) =>
        s.slotId !== slot.id &&
        timesOverlap(slot.start_time, slot.end_time, s.startTime, s.endTime),
    )
  }

  async function handleSignup(slotId: string): Promise<void> {
    const ok = await signUp(slotId)
    if (ok) {
      refetchFillRates()
      refetchMySignups()
    }
  }

  async function handleUnsignup(slotId: string): Promise<void> {
    const ok = await unsignUp(slotId)
    if (ok) {
      refetchFillRates()
      refetchMySignups()
    }
  }

  if (eventLoading || (eventId && standsLoading)) {
    return <LoadingSkeleton />
  }

  if (eventError) {
    return <ErrorMessage onRetry={refetchEvent} />
  }

  if (!event) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-lg">Aucune kermesse n'est ouverte pour le moment.</p>
        <p className="text-sm mt-2">
          Revenez bientôt : les organisateurs préparent la prochaine édition.
        </p>
      </div>
    )
  }

  const pastEvent = isEventPast(event.date)
  const timeRange =
    event.start_time && event.end_time
      ? ` · ${formatTime(event.start_time)} – ${formatTime(event.end_time)}`
      : ''

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h1 className="text-2xl font-bold text-slate-900">{event.name}</h1>
        <p className="text-sm text-amber-800 mt-1">
          {formatEventDate(event.date)}
          {timeRange}
        </p>
        {event.location && (
          <p className="text-sm text-amber-700 mt-0.5">📍 {event.location}</p>
        )}
        {pastEvent && (
          <p className="text-xs text-slate-500 mt-2">
            Cette kermesse est passée — les inscriptions sont clôturées.
          </p>
        )}
      </section>

      {standsError ? (
        <ErrorMessage onRetry={refetchStands} />
      ) : stands.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">Aucun stand n'a encore été créé.</p>
          <p className="text-sm mt-2">
            Les stands apparaîtront ici dès que les organisateurs les auront
            ajoutés.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {stands.map((stand) => (
            <StandCard
              key={stand.id}
              stand={stand}
              fillRates={fillRates}
              statusBySlot={statusBySlot}
              overlapsSlot={overlapsSlot}
              isPastEvent={pastEvent}
              onSignup={handleSignup}
              onUnsignup={handleUnsignup}
            />
          ))}
        </div>
      )}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { useAuth } from '@agpe/shared/auth/useAuth'
import { useMySignups } from '@/hooks/useMySignups'
import { useSignups } from '@/hooks/useSignups'
import { useActiveEvent } from '@/hooks/useActiveEvent'
import {
  groupConsecutiveSignups,
  type PlanningGroup,
} from '@/lib/planning-groups'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'
import {
  formatTime,
  formatDayShort,
  formatEventDateRange,
  isDateTimePast,
} from '@/lib/date-utils'

interface EventSection {
  eventId: string
  eventName: string
  eventDate: string
  eventEndDate: string
  groups: PlanningGroup[]
}

export function MyPlanning() {
  const { user } = useAuth()
  const { signups, loading, error, refetch } = useMySignups(user?.id ?? null)
  const { unsignUp, unsignUpMany } = useSignups()
  const { event: activeEvent } = useActiveEvent()
  const [toUnsubscribe, setToUnsubscribe] = useState<PlanningGroup | null>(null)

  // Regroupe les créneaux consécutifs, puis range les groupes par événement
  // (les groupes sont déjà triés chronologiquement par groupConsecutiveSignups).
  const sections = useMemo<EventSection[]>(() => {
    const groups = groupConsecutiveSignups(signups)
    const byEvent = new Map<string, EventSection>()
    const order: string[] = []
    for (const g of groups) {
      let section = byEvent.get(g.eventId)
      if (!section) {
        section = {
          eventId: g.eventId,
          eventName: g.eventName,
          eventDate: g.eventDate,
          eventEndDate: g.eventEndDate,
          groups: [],
        }
        byEvent.set(g.eventId, section)
        order.push(g.eventId)
      }
      section.groups.push(g)
    }
    return order.map((id) => byEvent.get(id)!)
  }, [signups])

  async function handleUnsubscribe(): Promise<void> {
    if (!toUnsubscribe) return
    const { slotIds } = toUnsubscribe
    const ok =
      slotIds.length > 1
        ? await unsignUpMany(slotIds)
        : await unsignUp(slotIds[0]!)
    if (ok) refetch()
  }

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorMessage onRetry={refetch} />

  return (
    <div>
      <PageHeader
        title="Mon planning"
        description="Récapitulatif de vos créneaux de bénévolat."
      />

      {sections.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">Vous n'êtes inscrit sur aucun créneau.</p>
          <p className="text-sm mt-2">
            Rendez-vous sur l'onglet « Stands » pour choisir un créneau.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => {
            const isActive = section.eventId === activeEvent?.id
            return (
              <section key={section.eventId}>
                <div className="mb-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {section.eventName || 'Événement'}
                    </h2>
                    {isActive && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                        Active
                      </Badge>
                    )}
                  </div>
                  {section.eventDate && (
                    <p className="text-sm text-slate-500">
                      {formatEventDateRange(section.eventDate, section.eventEndDate)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  {section.groups.map((s) => {
                    const past = isDateTimePast(s.slotDate, s.endTime)
                    return (
                      <div
                        key={s.key}
                        className={cn(
                          'flex items-center justify-between gap-3 rounded-md border border-l-4 p-3',
                          isActive ? 'border-l-primary' : 'border-l-slate-400',
                          past ? 'bg-slate-50 opacity-60' : 'bg-white',
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="text-2xl" aria-hidden="true">
                            {s.standEmoji ?? '🎪'}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">
                              {s.slotDate && (
                                <span className="capitalize">
                                  {formatDayShort(s.slotDate)} ·{' '}
                                </span>
                              )}
                              {formatTime(s.startTime)} → {formatTime(s.endTime)}
                            </p>
                            <p className="truncate text-sm text-slate-600">
                              {s.standName}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                              Évènement : {s.eventName}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {s.status === 'replacement' ? (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                              Remplaçant
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                              Réservé
                            </Badge>
                          )}
                          {past ? (
                            <span className="text-xs text-slate-400">Terminé</span>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setToUnsubscribe(s)}
                            >
                              Se désinscrire
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={toUnsubscribe !== null}
        title="Confirmer la désinscription ?"
        description={
          toUnsubscribe
            ? toUnsubscribe.slotIds.length > 1
              ? `Voulez-vous vous désinscrire de tous les créneaux ${toUnsubscribe.standName} du ${formatDayShort(
                  toUnsubscribe.slotDate,
                )}, de ${formatTime(toUnsubscribe.startTime)} à ${formatTime(
                  toUnsubscribe.endTime,
                )} ?`
              : `Créneau ${formatTime(toUnsubscribe.startTime)} → ${formatTime(
                  toUnsubscribe.endTime,
                )} — ${toUnsubscribe.standName}.`
            : undefined
        }
        confirmLabel="Se désinscrire"
        destructive
        onConfirm={handleUnsubscribe}
        onOpenChange={(open) => {
          if (!open) setToUnsubscribe(null)
        }}
      />
    </div>
  )
}

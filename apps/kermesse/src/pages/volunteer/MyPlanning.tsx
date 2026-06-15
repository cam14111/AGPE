import { useMemo, useState } from 'react'
import { useAuth } from '@agpe/shared/auth/useAuth'
import { useMySignups, type MySignup } from '@/hooks/useMySignups'
import { useSignups } from '@/hooks/useSignups'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'
import { formatTime, formatDayShort, isDateTimePast } from '@/lib/date-utils'

export function MyPlanning() {
  const { user } = useAuth()
  const { signups, loading, error, refetch } = useMySignups(user?.id ?? null)
  const { unsignUp } = useSignups()
  const [toUnsubscribe, setToUnsubscribe] = useState<MySignup | null>(null)

  // Tri chronologique : par date de créneau puis heure de début.
  const ordered = useMemo(
    () =>
      [...signups].sort((a, b) => {
        const dateCmp = (a.slotDate ?? '').localeCompare(b.slotDate ?? '')
        if (dateCmp !== 0) return dateCmp
        return a.startTime.localeCompare(b.startTime)
      }),
    [signups],
  )

  async function handleUnsubscribe(): Promise<void> {
    if (!toUnsubscribe) return
    const ok = await unsignUp(toUnsubscribe.slotId)
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

      {ordered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">Vous n'êtes inscrit sur aucun créneau.</p>
          <p className="text-sm mt-2">
            Rendez-vous sur l'onglet « Stands » pour choisir un créneau.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {ordered.map((s) => {
            const past = isDateTimePast(s.slotDate, s.endTime)
            return (
              <div
                key={s.id}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-md border p-3',
                  past ? 'bg-slate-50 opacity-60' : 'bg-white',
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {s.standEmoji ?? '🎪'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {s.slotDate && (
                        <span className="capitalize">
                          {formatDayShort(s.slotDate)} ·{' '}
                        </span>
                      )}
                      {formatTime(s.startTime)} → {formatTime(s.endTime)}
                    </p>
                    <p className="truncate text-xs text-slate-500">{s.standName}</p>
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
      )}

      <ConfirmDialog
        open={toUnsubscribe !== null}
        title="Confirmer la désinscription ?"
        description={
          toUnsubscribe
            ? `Créneau ${formatTime(toUnsubscribe.startTime)} → ${formatTime(
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

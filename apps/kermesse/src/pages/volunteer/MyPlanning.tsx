import { useMemo, useState } from 'react'
import { useAuth } from '@agpe/shared/auth/useAuth'
import { useMySignups, type MySignup } from '@/hooks/useMySignups'
import { useSignups } from '@/hooks/useSignups'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { PageHeader } from '@/components/shared/PageHeader'
import { formatTime, isEventPast } from '@/lib/date-utils'

interface StandGroup {
  standName: string
  standEmoji: string | null
  signups: MySignup[]
}

export function MyPlanning() {
  const { user } = useAuth()
  const { signups, loading, error, refetch } = useMySignups(user?.id ?? null)
  const { unsignUp } = useSignups()
  const [toUnsubscribe, setToUnsubscribe] = useState<MySignup | null>(null)

  // Regroupement par stand.
  const groups = useMemo<StandGroup[]>(() => {
    const map = new Map<string, StandGroup>()
    for (const s of signups) {
      const existing = map.get(s.standName)
      if (existing) {
        existing.signups.push(s)
      } else {
        map.set(s.standName, {
          standName: s.standName,
          standEmoji: s.standEmoji,
          signups: [s],
        })
      }
    }
    return Array.from(map.values())
  }, [signups])

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

      {signups.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">Vous n'êtes inscrit sur aucun créneau.</p>
          <p className="text-sm mt-2">
            Rendez-vous sur l'onglet « Stands » pour choisir un créneau.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.standName}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span aria-hidden="true">{group.standEmoji ?? '🎪'}</span>
                  {group.standName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.signups.map((s) => {
                  const past = isEventPast(s.eventDate)
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-md border bg-white p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">
                          {formatTime(s.startTime)} → {formatTime(s.endTime)}
                        </span>
                        {s.status === 'replacement' ? (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                            Remplaçant
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                            Réservé
                          </Badge>
                        )}
                      </div>
                      {!past && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setToUnsubscribe(s)}
                        >
                          Se désinscrire
                        </Button>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
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

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useActiveEvent } from '@/hooks/useActiveEvent'
import { useStands } from '@/hooks/useStands'
import { useAdminSignups } from '@/hooks/useAdminSignups'
import { useNow } from '@/hooks/useNow'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/ui/button'
import { StandRecapCard } from '@/components/admin/StandRecapCard'
import { LiveStandCard } from '@/components/admin/LiveStandCard'
import { formatTime } from '@/lib/date-utils'
import { nowParts } from '@/lib/live-board'
import { cn } from '@/lib/utils'
import type { AdminSignupDetail } from '@/hooks/useAdminSignups'

type Tab = 'recap' | 'live'

const TABS: ReadonlyArray<readonly [Tab, string]> = [
  ['recap', 'Récapitulatif'],
  ['live', 'Temps réel'],
]

// Écran admin de supervision des stands : récapitulatif par stand + vue temps réel.
export function Supervision() {
  const { event, loading: eventLoading } = useActiveEvent()
  const eventId = event?.id ?? null
  const {
    stands,
    loading: standsLoading,
    error: standsError,
    refetch: refetchStands,
  } = useStands(eventId)
  const { details, error: detailsError, refetch: refetchSignups } =
    useAdminSignups(eventId)
  const [tab, setTab] = useState<Tab>('recap')
  const now = useNow(30_000)

  // En vue temps réel, on recharge les données toutes les 60 s.
  useEffect(() => {
    if (tab !== 'live') return
    const id = setInterval(() => {
      refetchStands()
      refetchSignups()
    }, 60_000)
    return () => clearInterval(id)
  }, [tab, refetchStands, refetchSignups])

  const participantsBySlot = useMemo(() => {
    const map = new Map<string, AdminSignupDetail[]>()
    for (const d of details) {
      const list = map.get(d.slot_id) ?? []
      list.push(d)
      map.set(d.slot_id, list)
    }
    return map
  }, [details])

  const nowP = useMemo(() => nowParts(now), [now])

  if (eventLoading) return <LoadingSkeleton />

  if (!event) {
    return (
      <div>
        <PageHeader title="Supervision" />
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">Aucune édition active.</p>
          <p className="text-sm mt-2">
            Activez une édition dans{' '}
            <Link to="/admin/events" className="text-primary underline">
              Événements
            </Link>{' '}
            pour superviser les stands.
          </p>
        </div>
      </div>
    )
  }

  const refresh = () => {
    refetchStands()
    refetchSignups()
  }

  return (
    <div>
      <PageHeader
        title="Supervision"
        description={event.name}
        action={
          <Button variant="outline" onClick={refresh}>
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <div className="inline-flex rounded-md border bg-white p-1" role="tablist">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                'rounded px-3 py-1.5 text-sm font-medium transition-colors',
                tab === key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'live' && (
          <span className="text-xs text-slate-400">
            à {formatTime(nowP.time)}
          </span>
        )}
      </div>

      {standsError || detailsError ? (
        <ErrorMessage onRetry={refresh} />
      ) : standsLoading ? (
        <LoadingSkeleton />
      ) : stands.length === 0 ? (
        <p className="py-12 text-center text-slate-500">
          Aucun stand pour cette édition.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {stands.map((stand) =>
            tab === 'recap' ? (
              <StandRecapCard
                key={stand.id}
                stand={stand}
                participantsBySlot={participantsBySlot}
                now={nowP}
              />
            ) : (
              <LiveStandCard
                key={stand.id}
                stand={stand}
                participantsBySlot={participantsBySlot}
                now={nowP}
              />
            ),
          )}
        </div>
      )}
    </div>
  )
}

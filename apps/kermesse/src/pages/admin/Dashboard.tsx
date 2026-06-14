import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Tent, Users, X } from 'lucide-react'
import { useActiveEvent } from '@/hooks/useActiveEvent'
import { useStands } from '@/hooks/useStands'
import { useFillRates } from '@/hooks/useFillRates'
import { useAdminSignups } from '@/hooks/useAdminSignups'
import { FillRateCard } from '@/components/admin/FillRateCard'
import { CsvExportButton } from '@/components/admin/CsvExportButton'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SlotBadge } from '@/components/volunteer/SlotBadge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { formatTime } from '@/lib/date-utils'
import { participantLabel } from '@/lib/participant'
import type { AdminSignupDetail } from '@/hooks/useAdminSignups'

interface SlotSummary {
  standName: string
  standEmoji: string | null
  startTime: string
  endTime: string
  max: number
  current: number
  remaining: number
  participants: AdminSignupDetail[]
}

export function Dashboard() {
  const { event, loading: eventLoading } = useActiveEvent()
  const eventId = event?.id ?? null
  const { stands, loading: standsLoading, error: standsError, refetch } =
    useStands(eventId)
  const { fillRates, refetch: refetchFillRates } = useFillRates()
  const { details, error: detailsError, removeSignup } = useAdminSignups(eventId)
  const [toRemove, setToRemove] = useState<AdminSignupDetail | null>(null)

  const summaries = useMemo<SlotSummary[]>(() => {
    const detailsBySlot = new Map<string, AdminSignupDetail[]>()
    for (const d of details) {
      const list = detailsBySlot.get(d.slot_id) ?? []
      list.push(d)
      detailsBySlot.set(d.slot_id, list)
    }
    const rows: SlotSummary[] = []
    for (const stand of stands) {
      for (const slot of stand.kermesse_slots) {
        const fill = fillRates[slot.id]
        const current = fill?.currentCount ?? 0
        rows.push({
          standName: stand.name,
          standEmoji: stand.emoji,
          startTime: slot.start_time,
          endTime: slot.end_time,
          max: slot.max_volunteers,
          current,
          remaining: slot.max_volunteers - current,
          participants: detailsBySlot.get(slot.id) ?? [],
        })
      }
    }
    // Tri : créneaux non pourvus en premier, puis par stand et horaire.
    rows.sort(
      (a, b) =>
        a.current - b.current ||
        a.standName.localeCompare(b.standName) ||
        a.startTime.localeCompare(b.startTime),
    )
    return rows
  }, [stands, fillRates, details])

  const kpis = useMemo(() => {
    const totalSlots = summaries.length
    const fullSlots = summaries.filter((s) => s.current >= s.max).length
    const emptySlots = summaries.filter((s) => s.current === 0).length
    const distinctVolunteers = new Set(details.map((d) => d.user_id)).size
    const incompleteStands = stands.filter((stand) =>
      stand.kermesse_slots.some((slot) => {
        const current = fillRates[slot.id]?.currentCount ?? 0
        return current < slot.max_volunteers
      }),
    ).length
    return {
      totalSlots,
      fullSlots,
      emptySlots,
      distinctVolunteers,
      incompleteStands,
      fullPct: totalSlots > 0 ? (fullSlots / totalSlots) * 100 : 0,
    }
  }, [summaries, details, stands, fillRates])

  if (eventLoading) return <LoadingSkeleton />

  if (!event) {
    return (
      <div>
        <PageHeader title="Tableau de bord" />
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">Aucune édition active.</p>
          <p className="text-sm mt-2">
            Activez une édition dans{' '}
            <Link to="/admin/events" className="text-primary underline">
              Événements
            </Link>{' '}
            pour suivre les inscriptions.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        description={event.name}
        action={<CsvExportButton details={details} />}
      />

      {standsError || detailsError ? (
        <ErrorMessage onRetry={refetch} />
      ) : standsLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <FillRateCard
              label="Bénévoles inscrits"
              value={kpis.distinctVolunteers}
              icon={Users}
            />
            <FillRateCard
              label="Créneaux complets"
              value={`${kpis.fullSlots} / ${kpis.totalSlots}`}
              icon={CheckCircle2}
              progress={kpis.fullPct}
            />
            <FillRateCard
              label="Créneaux non pourvus"
              value={kpis.emptySlots}
              icon={AlertTriangle}
              danger={kpis.emptySlots > 0}
            />
            <FillRateCard
              label="Stands incomplets"
              value={kpis.incompleteStands}
              icon={Tent}
            />
          </div>

          <Card className="mt-6">
            <CardContent className="p-0">
              {summaries.length === 0 ? (
                <p className="py-12 text-center text-slate-500">
                  Aucun créneau pour le moment. Ajoutez des stands et des
                  créneaux pour suivre les inscriptions.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stand</TableHead>
                      <TableHead>Créneau</TableHead>
                      <TableHead>Inscrits</TableHead>
                      <TableHead className="text-right">Places restantes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaries.map((s, i) => (
                      <TableRow key={`${s.standName}-${s.startTime}-${i}`}>
                        <TableCell className="font-medium">
                          <span aria-hidden="true">{s.standEmoji ?? '🎪'}</span>{' '}
                          {s.standName}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatTime(s.startTime)} → {formatTime(s.endTime)}
                        </TableCell>
                        <TableCell>
                          {s.participants.length === 0 ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {s.participants.map((p) => (
                                <span
                                  key={p.signup_id}
                                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                                >
                                  {participantLabel(p)}
                                  <button
                                    type="button"
                                    onClick={() => setToRemove(p)}
                                    aria-label={`Désinscrire ${participantLabel(p)}`}
                                    className="rounded-full p-0.5 text-slate-400 hover:bg-red-100 hover:text-red-600"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-slate-400">
                              {s.current} / {s.max}
                            </span>
                            <SlotBadge current={s.current} max={s.max} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={toRemove !== null}
        title="Désinscrire ce bénévole ?"
        description={
          toRemove
            ? `${participantLabel(toRemove)} sera retiré de ce créneau. La place se libérera pour un autre bénévole.`
            : undefined
        }
        confirmLabel="Désinscrire"
        destructive
        onConfirm={async () => {
          if (toRemove) {
            const ok = await removeSignup(toRemove.signup_id)
            if (ok) refetchFillRates()
          }
        }}
        onOpenChange={(open) => {
          if (!open) setToRemove(null)
        }}
      />
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Tent, Users } from 'lucide-react'
import { useEvents } from '@/hooks/useEvents'
import { useStands } from '@/hooks/useStands'
import { useFillRates } from '@/hooks/useFillRates'
import { useAdminSignups } from '@/hooks/useAdminSignups'
import { FillRateCard } from '@/components/admin/FillRateCard'
import { CsvExportButton } from '@/components/admin/CsvExportButton'
import { ParticipantChip } from '@/components/admin/ParticipantChip'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import {
  formatDayCompact,
  formatDayMonth,
  formatTime,
  isEventPast,
} from '@/lib/date-utils'
import { participantLabel } from '@/lib/participant'
import type { EventRow } from '@/lib/domain'
import type { AdminSignupDetail } from '@/hooks/useAdminSignups'

// Suffixe de statut affiché dans la liste déroulante d'événements.
function eventStatusSuffix(event: EventRow): string {
  if (event.is_active) return 'en cours'
  return isEventPast(event.end_date) ? 'passé' : 'à venir'
}

// Date du jour au format YYYY-MM-DD (fuseau local).
function todayIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Choisit l'événement présélectionné : actif > prochain à venir > plus récent.
function pickDefaultEvent(events: EventRow[]): EventRow | null {
  if (events.length === 0) return null
  const active = events.find((e) => e.is_active)
  if (active) return active
  const today = todayIso()
  const upcoming = events
    .filter((e) => e.start_date >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
  return upcoming[0] ?? events[0] ?? null
}

type DashboardFilter = 'volunteers' | 'full' | 'empty' | 'incompleteStands'

const FILTER_LABELS: Record<DashboardFilter, string> = {
  volunteers: 'Bénévoles inscrits',
  full: 'Créneaux complets',
  empty: 'Créneaux non pourvus',
  incompleteStands: 'Stands incomplets',
}

interface SlotSummary {
  slotId: string
  slotDate: string
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
  const { events, loading: eventsLoading } = useEvents()
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [toRemove, setToRemove] = useState<AdminSignupDetail | null>(null)
  const [filter, setFilter] = useState<DashboardFilter | null>(null)

  // Présélection une fois la liste chargée (sélection purement locale, ne
  // modifie pas l'événement actif global de l'application).
  useEffect(() => {
    if (selectedEventId === null && events.length > 0) {
      setSelectedEventId(pickDefaultEvent(events)?.id ?? null)
    }
  }, [events, selectedEventId])

  const eventId = selectedEventId
  const { stands, loading: standsLoading, error: standsError, refetch } =
    useStands(eventId)
  const { fillRates, refetch: refetchFillRates } = useFillRates()
  const { details, error: detailsError, removeSignup } = useAdminSignups(eventId)

  function handleEventChange(id: string): void {
    setSelectedEventId(id)
    setFilter(null)
  }

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
          slotId: slot.id,
          slotDate: slot.date ?? '',
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
    // Tri : créneaux non pourvus en premier, puis par stand, jour et horaire.
    rows.sort(
      (a, b) =>
        a.current - b.current ||
        a.standName.localeCompare(b.standName) ||
        a.slotDate.localeCompare(b.slotDate) ||
        a.startTime.localeCompare(b.startTime),
    )
    return rows
  }, [stands, fillRates, details])

  // Noms des stands ayant au moins un créneau incomplet (≥ 1 place restante).
  const incompleteStandNames = useMemo(() => {
    const set = new Set<string>()
    for (const stand of stands) {
      const incomplete = stand.kermesse_slots.some((slot) => {
        const current = fillRates[slot.id]?.currentCount ?? 0
        return current < slot.max_volunteers
      })
      if (incomplete) set.add(stand.name)
    }
    return set
  }, [stands, fillRates])

  const kpis = useMemo(() => {
    const totalSlots = summaries.length
    const fullSlots = summaries.filter((s) => s.current >= s.max).length
    const emptySlots = summaries.filter((s) => s.current === 0).length
    const distinctVolunteers = new Set(details.map((d) => d.user_id)).size
    return {
      totalSlots,
      fullSlots,
      emptySlots,
      distinctVolunteers,
      incompleteStands: incompleteStandNames.size,
      fullPct: totalSlots > 0 ? (fullSlots / totalSlots) * 100 : 0,
    }
  }, [summaries, details, incompleteStandNames])

  const visibleSummaries = useMemo(() => {
    switch (filter) {
      case 'volunteers':
        return summaries.filter((s) => s.current >= 1)
      case 'full':
        return summaries.filter((s) => s.current >= s.max)
      case 'empty':
        return summaries.filter((s) => s.current === 0)
      case 'incompleteStands':
        return summaries.filter((s) => incompleteStandNames.has(s.standName))
      default:
        return summaries
    }
  }, [summaries, filter, incompleteStandNames])

  const visibleDetails = useMemo(() => {
    if (filter === null) return details
    const visibleSlotIds = new Set(visibleSummaries.map((s) => s.slotId))
    return details.filter((d) => visibleSlotIds.has(d.slot_id))
  }, [details, filter, visibleSummaries])

  function toggleFilter(next: DashboardFilter): void {
    setFilter((prev) => (prev === next ? null : next))
  }

  if (eventsLoading) return <LoadingSkeleton />

  if (events.length === 0) {
    return (
      <div>
        <PageHeader title="Tableau de bord" />
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">Aucun événement disponible.</p>
          <p className="text-sm mt-2">
            Créez une édition dans{' '}
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
        action={<CsvExportButton details={visibleDetails} />}
      />

      <div className="mb-6 -mt-2">
        <Select value={selectedEventId ?? undefined} onValueChange={handleEventChange}>
          <SelectTrigger
            className="w-full sm:w-80"
            aria-label="Sélectionner un événement"
          >
            <SelectValue placeholder="Sélectionner un événement" />
          </SelectTrigger>
          <SelectContent>
            {events.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name} ({eventStatusSuffix(e)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
              onClick={() => toggleFilter('volunteers')}
              active={filter === 'volunteers'}
              ariaLabel="Filtrer les créneaux avec bénévoles inscrits"
            />
            <FillRateCard
              label="Créneaux complets"
              value={`${kpis.fullSlots} / ${kpis.totalSlots}`}
              icon={CheckCircle2}
              progress={kpis.fullPct}
              onClick={() => toggleFilter('full')}
              active={filter === 'full'}
              ariaLabel="Filtrer les créneaux complets"
            />
            <FillRateCard
              label="Créneaux non pourvus"
              value={kpis.emptySlots}
              icon={AlertTriangle}
              danger={kpis.emptySlots > 0}
              onClick={() => toggleFilter('empty')}
              active={filter === 'empty'}
              ariaLabel="Filtrer les créneaux non pourvus"
            />
            <FillRateCard
              label="Stands incomplets"
              value={kpis.incompleteStands}
              icon={Tent}
              onClick={() => toggleFilter('incompleteStands')}
              active={filter === 'incompleteStands'}
              ariaLabel="Filtrer les stands incomplets"
            />
          </div>

          {filter !== null && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
              <span className="text-slate-700">
                Filtre actif :{' '}
                <span className="font-semibold text-slate-900">
                  {FILTER_LABELS[filter]}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setFilter(null)}
                className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Réinitialiser le filtre
              </button>
            </div>
          )}

          <Card className="mt-6">
            <CardContent className="p-0">
              {summaries.length === 0 ? (
                <p className="py-12 text-center text-slate-500">
                  Aucun créneau pour le moment. Ajoutez des stands et des
                  créneaux pour suivre les inscriptions.
                </p>
              ) : visibleSummaries.length === 0 ? (
                <p className="py-12 text-center text-slate-500">
                  Aucune ligne ne correspond à ce filtre.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stand</TableHead>
                      <TableHead>Jour</TableHead>
                      <TableHead>Créneau</TableHead>
                      <TableHead>Inscrits</TableHead>
                      <TableHead className="text-right">Places restantes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleSummaries.map((s, i) => (
                      <TableRow key={`${s.slotId}-${i}`}>
                        <TableCell className="font-medium">
                          <span aria-hidden="true">{s.standEmoji ?? '🎪'}</span>{' '}
                          {s.standName}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="hidden sm:inline">
                            {formatDayMonth(s.slotDate)}
                          </span>
                          <span className="sm:hidden">
                            {formatDayCompact(s.slotDate)}
                          </span>
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
                                <ParticipantChip
                                  key={p.signup_id}
                                  detail={p}
                                  onRemove={() => setToRemove(p)}
                                />
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

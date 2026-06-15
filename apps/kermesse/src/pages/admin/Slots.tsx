import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Pencil, Plus, Trash2, Wand2 } from 'lucide-react'
import { useAuth } from '@agpe/shared/auth/useAuth'
import { useActiveEvent } from '@/hooks/useActiveEvent'
import { useStands } from '@/hooks/useStands'
import { useEventDaySchedules } from '@/hooks/useEventDaySchedules'
import { useFillRates } from '@/hooks/useFillRates'
import { useSlotMutations } from '@/hooks/useSlotMutations'
import { useSignups } from '@/hooks/useSignups'
import { useAdminSignups, type AdminSignupDetail } from '@/hooks/useAdminSignups'
import { SlotForm } from '@/components/admin/SlotForm'
import { AutoGenerateSlotsDialog } from '@/components/admin/AutoGenerateSlotsDialog'
import { StandSlotsPreview } from '@/components/admin/StandSlotsPreview'
import { SlotBadge } from '@/components/volunteer/SlotBadge'
import { ParticipantChip } from '@/components/admin/ParticipantChip'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatTime, formatDayShort } from '@/lib/date-utils'
import { standOpenDays } from '@/lib/domain'
import { participantLabel } from '@/lib/participant'
import type { SlotRow } from '@/lib/domain'

export function Slots() {
  const [searchParams] = useSearchParams()
  const queryStandId = searchParams.get('standId')

  const { event, loading: eventLoading } = useActiveEvent()
  const eventId = event?.id ?? null
  const { stands, loading, error, refetch } = useStands(eventId)
  const { schedules: daySchedules } = useEventDaySchedules(eventId)
  const { user } = useAuth()
  const { fillRates, refetch: refetchFillRates } = useFillRates()
  const { details, removeSignup, refetch: refetchDetails } =
    useAdminSignups(eventId)
  const { signUp, unsignUp } = useSignups()
  const { createSlot, createSlots, updateSlot, deleteSlot } = useSlotMutations(() => {
    refetch()
    refetchFillRates()
  })

  const [selectedStandId, setSelectedStandId] = useState<string>('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SlotRow | null>(null)
  const [createDay, setCreateDay] = useState<string>('')
  const [toDelete, setToDelete] = useState<SlotRow | null>(null)
  const [toRemove, setToRemove] = useState<AdminSignupDetail | null>(null)
  const [selfBusySlot, setSelfBusySlot] = useState<string | null>(null)
  const [autoGenerateOpen, setAutoGenerateOpen] = useState(false)
  // Garde : le paramètre d'URL ne présélectionne le stand qu'une seule fois.
  const queryApplied = useRef(false)

  const selectedStand = stands.find((s) => s.id === selectedStandId) ?? null
  const openDays = useMemo(
    () => (selectedStand ? standOpenDays(selectedStand) : []),
    [selectedStand],
  )

  // Sélectionne le stand via URL param (une fois) ou le premier par défaut.
  useEffect(() => {
    if (stands.length === 0) return
    if (
      !queryApplied.current &&
      queryStandId &&
      stands.some((s) => s.id === queryStandId)
    ) {
      setSelectedStandId(queryStandId)
      queryApplied.current = true
    } else if (!selectedStandId) {
      setSelectedStandId(stands[0]?.id ?? '')
    }
  }, [stands, selectedStandId, queryStandId])

  async function toggleSelfSignup(slot: SlotRow): Promise<void> {
    if (!user) return
    const mine = (participantsBySlot.get(slot.id) ?? []).find(
      (p) => p.user_id === user.id,
    )
    setSelfBusySlot(slot.id)
    try {
      const ok = mine
        ? await unsignUp(slot.id)
        : (await signUp(slot.id)) !== null
      if (ok) {
        refetchDetails()
        refetchFillRates()
      }
    } finally {
      setSelfBusySlot(null)
    }
  }

  const participantsBySlot = useMemo(() => {
    const map = new Map<string, AdminSignupDetail[]>()
    for (const d of details) {
      const list = map.get(d.slot_id) ?? []
      list.push(d)
      map.set(d.slot_id, list)
    }
    return map
  }, [details])

  if (eventLoading) return <LoadingSkeleton />

  if (!event) {
    return (
      <div>
        <PageHeader title="Créneaux" />
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">Aucune édition active.</p>
          <p className="text-sm mt-2">
            Activez une édition dans{' '}
            <Link to="/admin/events" className="text-primary underline">
              Événements
            </Link>
            .
          </p>
        </div>
      </div>
    )
  }

  function openCreate(day: string): void {
    setEditing(null)
    setCreateDay(day)
    setFormOpen(true)
  }

  function openEdit(slot: SlotRow): void {
    setEditing(slot)
    setFormOpen(true)
  }

  function renderSlot(slot: SlotRow) {
    const fill = fillRates[slot.id]
    const current = fill?.currentCount ?? 0
    const participants = participantsBySlot.get(slot.id) ?? []
    const mine = participants.find((p) => p.user_id === user?.id)
    const isFull = current >= slot.max_volunteers
    const busy = selfBusySlot === slot.id
    return (
      <div key={slot.id} className="space-y-2 rounded-md border bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-800">
              {formatTime(slot.start_time)} → {formatTime(slot.end_time)}
            </span>
            <SlotBadge current={current} max={slot.max_volunteers} />
            <span className="text-xs text-slate-400">
              {current} / {slot.max_volunteers}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={mine ? 'outline' : 'default'}
              size="sm"
              onClick={() => void toggleSelfSignup(slot)}
              disabled={busy}
              aria-busy={busy}
            >
              {mine ? 'Me désinscrire' : isFull ? 'Remplaçant' : "M'inscrire"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEdit(slot)}
              aria-label="Modifier le créneau"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setToDelete(slot)}
              aria-label="Supprimer le créneau"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        </div>

        {participants.length > 0 && (
          <div className="flex flex-wrap gap-1 border-t pt-2">
            {participants.map((p) => (
              <ParticipantChip
                key={p.signup_id}
                detail={p}
                onRemove={() => setToRemove(p)}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Créneaux"
        description={`Édition active : ${event.name}`}
      />

      {error ? (
        <ErrorMessage onRetry={refetch} />
      ) : loading ? (
        <LoadingSkeleton />
      ) : stands.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">Aucun stand disponible.</p>
          <p className="text-sm mt-2">
            Créez d'abord un stand dans{' '}
            <Link to="/admin/stands" className="text-primary underline">
              Stands
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 max-w-xs">
            <Select value={selectedStandId} onValueChange={setSelectedStandId}>
              <SelectTrigger aria-label="Choisir un stand">
                <SelectValue placeholder="Choisir un stand" />
              </SelectTrigger>
              <SelectContent>
                {stands.map((stand) => (
                  <SelectItem key={stand.id} value={stand.id}>
                    {(stand.emoji ?? '🎪') + ' ' + stand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStand && (
            <div className="space-y-4">
              {/* Aperçu visuel des créneaux du stand */}
              {openDays.length > 0 && (
                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base capitalize">
                      {selectedStand.name}
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAutoGenerateOpen(true)}
                      aria-label="Autogénérer des créneaux"
                    >
                      <Wand2 className="h-4 w-4" />
                      Autogénérer
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <StandSlotsPreview
                      eventRow={event}
                      daySchedules={daySchedules}
                      openDays={openDays}
                      slots={selectedStand.kermesse_slots}
                      fillRates={fillRates}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Une section par journée d'ouverture */}
              {openDays.map((day) => {
                const slotsForDay = selectedStand.kermesse_slots.filter(
                  (s) => (s.date ?? '') === day,
                )
                return (
                  <Card key={day}>
                    <CardHeader className="flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-base capitalize">
                        {formatDayShort(day)}
                      </CardTitle>
                      <Button size="sm" onClick={() => openCreate(day)}>
                        <Plus className="h-4 w-4" />
                        Nouveau créneau
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {slotsForDay.length === 0 ? (
                        <p className="py-6 text-center text-sm text-slate-400">
                          Aucun créneau pour cette journée. Ajoutez-en un.
                        </p>
                      ) : (
                        slotsForDay.map(renderSlot)
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {selectedStand && (
        <>
          <SlotForm
            open={formOpen}
            slot={editing}
            standId={selectedStand.id}
            standDate={editing?.date || createDay || openDays[0] || event.start_date}
            standOpenDays={openDays}
            eventRow={event}
            daySchedules={daySchedules}
            existingSlots={selectedStand.kermesse_slots}
            onOpenChange={setFormOpen}
            onSubmit={(values) =>
              editing ? updateSlot(editing.id, values) : createSlot(values)
            }
          />

          <AutoGenerateSlotsDialog
            open={autoGenerateOpen}
            standId={selectedStand.id}
            startDay={openDays[0] || event.start_date}
            standOpenDays={openDays}
            eventRow={event}
            daySchedules={daySchedules}
            existingSlots={selectedStand.kermesse_slots}
            onGenerate={createSlots}
            onOpenChange={(o) => setAutoGenerateOpen(o)}
          />
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer ce créneau ?"
        description="Le créneau et les inscriptions associées seront supprimés définitivement."
        confirmLabel="Supprimer"
        destructive
        onConfirm={async () => {
          if (toDelete) await deleteSlot(toDelete.id)
        }}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
      />

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

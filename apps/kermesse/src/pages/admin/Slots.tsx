import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@agpe/shared/auth/useAuth'
import { useActiveEvent } from '@/hooks/useActiveEvent'
import { useStands } from '@/hooks/useStands'
import { useFillRates } from '@/hooks/useFillRates'
import { useSlotMutations } from '@/hooks/useSlotMutations'
import { useSignups } from '@/hooks/useSignups'
import { useAdminSignups, type AdminSignupDetail } from '@/hooks/useAdminSignups'
import { SlotForm } from '@/components/admin/SlotForm'
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
import { formatTime } from '@/lib/date-utils'
import { participantLabel } from '@/lib/participant'
import type { SlotRow } from '@/lib/domain'

export function Slots() {
  const { event, loading: eventLoading } = useActiveEvent()
  const eventId = event?.id ?? null
  const { stands, loading, error, refetch } = useStands(eventId)
  const { user } = useAuth()
  const { fillRates, refetch: refetchFillRates } = useFillRates()
  const { details, removeSignup, refetch: refetchDetails } =
    useAdminSignups(eventId)
  const { signUp, unsignUp } = useSignups()
  const { createSlot, updateSlot, deleteSlot } = useSlotMutations(() => {
    refetch()
    refetchFillRates()
  })

  const [selectedStandId, setSelectedStandId] = useState<string>('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SlotRow | null>(null)
  const [toDelete, setToDelete] = useState<SlotRow | null>(null)
  const [toRemove, setToRemove] = useState<AdminSignupDetail | null>(null)
  const [selfBusySlot, setSelfBusySlot] = useState<string | null>(null)

  // Inscription / désinscription de l'admin lui-même sur un créneau.
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

  // Inscrits regroupés par créneau.
  const participantsBySlot = useMemo(() => {
    const map = new Map<string, AdminSignupDetail[]>()
    for (const d of details) {
      const list = map.get(d.slot_id) ?? []
      list.push(d)
      map.set(d.slot_id, list)
    }
    return map
  }, [details])

  // Sélectionne le premier stand par défaut une fois la liste chargée.
  useEffect(() => {
    if (!selectedStandId && stands.length > 0) {
      setSelectedStandId(stands[0]?.id ?? '')
    }
  }, [stands, selectedStandId])

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

  const selectedStand = stands.find((s) => s.id === selectedStandId) ?? null

  function openCreate(): void {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(slot: SlotRow): void {
    setEditing(slot)
    setFormOpen(true)
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
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">
                  Créneaux — {selectedStand.name}
                </CardTitle>
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Nouveau créneau
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedStand.kermesse_slots.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">
                    Aucun créneau pour ce stand. Ajoutez-en un.
                  </p>
                ) : (
                  selectedStand.kermesse_slots.map((slot) => {
                    const fill = fillRates[slot.id]
                    const current = fill?.currentCount ?? 0
                    const participants = participantsBySlot.get(slot.id) ?? []
                    const mine = participants.find((p) => p.user_id === user?.id)
                    const isFull = current >= slot.max_volunteers
                    const busy = selfBusySlot === slot.id
                    return (
                      <div
                        key={slot.id}
                        className="space-y-2 rounded-md border bg-white p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-800">
                              {formatTime(slot.start_time)} →{' '}
                              {formatTime(slot.end_time)}
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
                              {mine
                                ? 'Me désinscrire'
                                : isFull
                                  ? 'Remplaçant'
                                  : "M'inscrire"}
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
                  })
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {selectedStand && (
        <SlotForm
          open={formOpen}
          slot={editing}
          standId={selectedStand.id}
          onOpenChange={setFormOpen}
          onSubmit={(values) =>
            editing ? updateSlot(editing.id, values) : createSlot(values)
          }
        />
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

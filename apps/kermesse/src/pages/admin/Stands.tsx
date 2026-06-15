import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarClock, Pencil, Plus, Trash2 } from 'lucide-react'
import { useActiveEvent, useEventById } from '@/hooks/useActiveEvent'
import { useStands } from '@/hooks/useStands'
import { useStandMutations } from '@/hooks/useStandMutations'
import { useEventDaySchedules } from '@/hooks/useEventDaySchedules'
import { useFillRates } from '@/hooks/useFillRates'
import { StandForm } from '@/components/admin/StandForm'
import { StandSlotsPreview } from '@/components/admin/StandSlotsPreview'
import { PostCreationDialog } from '@/components/admin/PostCreationDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDayShort } from '@/lib/date-utils'
import { standOpenDays, type StandWithSlots } from '@/lib/domain'

export function Stands() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryEventId = searchParams.get('eventId')

  const { event: activeEvent, loading: activeLoading } = useActiveEvent()
  const { event: specificEvent, loading: specificLoading } = useEventById(queryEventId)

  const event = queryEventId ? specificEvent : activeEvent
  const eventLoading = queryEventId ? specificLoading : activeLoading
  const eventId = event?.id ?? null

  const { stands, loading, error, refetch } = useStands(eventId)
  const { createStand, updateStand, deleteStand } = useStandMutations(refetch)
  const { schedules: daySchedules } = useEventDaySchedules(eventId)
  const { fillRates } = useFillRates()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<StandWithSlots | null>(null)
  const [toDelete, setToDelete] = useState<StandWithSlots | null>(null)
  const [postCreationStandId, setPostCreationStandId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  if (eventLoading) return <LoadingSkeleton />

  if (!event) {
    return (
      <div>
        <PageHeader title="Stands" />
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">Aucune édition active.</p>
          <p className="text-sm mt-2">
            Activez une édition dans{' '}
            <Link to="/admin/events" className="text-primary underline">
              Événements
            </Link>{' '}
            pour gérer ses stands.
          </p>
        </div>
      </div>
    )
  }

  function openCreate(): void {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(stand: StandWithSlots): void {
    setEditing(stand)
    setFormOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="Stands"
        description={`Édition : ${event.name}`}
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouveau stand
          </Button>
        }
      />

      {error ? (
        <ErrorMessage onRetry={refetch} />
      ) : loading ? (
        <LoadingSkeleton />
      ) : stands.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">Aucun stand n'a encore été créé.</p>
          <Button className="mt-4" onClick={openCreate}>
            Créer le premier stand
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {stands.map((stand) => {
            const days = standOpenDays(stand)
            const daysLabel = days.map(formatDayShort).join(', ')
            const hovered = hoveredId === stand.id
            const hasSlots = stand.kermesse_slots.length > 0
            return (
              <Card
                key={stand.id}
                onMouseEnter={() => setHoveredId(stand.id)}
                onMouseLeave={() =>
                  setHoveredId((prev) => (prev === stand.id ? null : prev))
                }
              >
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" aria-hidden="true">
                        {stand.emoji ?? '🎪'}
                      </span>
                      <div>
                        <h2 className="text-base font-semibold text-slate-800">
                          {stand.name}
                        </h2>
                        <p className="text-xs text-slate-400">
                          {stand.kermesse_slots.length} créneau
                          {stand.kermesse_slots.length > 1 ? 'x' : ''}
                          {daysLabel ? ` · ${daysLabel}` : ''}
                          {stand.location_detail ? ` · ${stand.location_detail}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/admin/slots?standId=${stand.id}`)}
                        aria-label={`Gérer les créneaux de ${stand.name}`}
                        title="Gérer les créneaux"
                      >
                        <CalendarClock className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(stand)}
                        aria-label={`Modifier ${stand.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToDelete(stand)}
                        aria-label={`Supprimer ${stand.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>

                  {/* Aperçu des créneaux au survol */}
                  {hovered && hasSlots && (
                    <div className="border-t pt-3">
                      <StandSlotsPreview
                        eventRow={event}
                        daySchedules={daySchedules}
                        openDays={days}
                        slots={stand.kermesse_slots}
                        fillRates={fillRates}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <StandForm
        open={formOpen}
        stand={editing}
        eventId={event.id}
        eventStartDate={event.start_date}
        eventEndDate={event.end_date}
        onOpenChange={setFormOpen}
        onSubmit={async (values, openDays) => {
          if (editing) return updateStand(editing.id, values, openDays)
          const id = await createStand(values, openDays)
          if (id !== null) {
            setPostCreationStandId(id)
            return true
          }
          return false
        }}
        onCreated={() => setFormOpen(false)}
      />

      <PostCreationDialog
        open={postCreationStandId !== null}
        title="Stand créé !"
        actions={[
          {
            label: 'Gérer les créneaux de ce stand',
            onClick: () => {
              navigate(`/admin/slots?standId=${postCreationStandId}`)
              setPostCreationStandId(null)
            },
          },
          {
            label: 'Créer un autre stand',
            variant: 'outline',
            onClick: () => {
              setPostCreationStandId(null)
              openCreate()
            },
          },
          {
            label: 'Terminer',
            variant: 'outline',
            onClick: () => setPostCreationStandId(null),
          },
        ]}
        onOpenChange={(o) => {
          if (!o) setPostCreationStandId(null)
        }}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer ce stand ?"
        description={
          toDelete
            ? `« ${toDelete.name} », ses créneaux et les inscriptions associées seront supprimés définitivement.`
            : undefined
        }
        confirmLabel="Supprimer"
        destructive
        onConfirm={async () => {
          if (toDelete) await deleteStand(toDelete.id)
        }}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
      />
    </div>
  )
}

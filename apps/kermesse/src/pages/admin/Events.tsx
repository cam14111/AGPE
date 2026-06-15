import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEvents } from '@/hooks/useEvents'
import { useEventDaySchedules } from '@/hooks/useEventDaySchedules'
import { EventForm } from '@/components/admin/EventForm'
import { PostCreationDialog } from '@/components/admin/PostCreationDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatEventDateRange } from '@/lib/date-utils'
import type { EventRow } from '@/lib/domain'

export function Events() {
  const navigate = useNavigate()
  const {
    events,
    loading,
    error,
    refetch,
    createEvent,
    updateEvent,
    deleteEvent,
    activateEvent,
  } = useEvents()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<EventRow | null>(null)
  const [toDelete, setToDelete] = useState<EventRow | null>(null)
  const [toActivate, setToActivate] = useState<EventRow | null>(null)
  const [postCreationEventId, setPostCreationEventId] = useState<string | null>(null)
  const [activateAskId, setActivateAskId] = useState<string | null>(null)
  // Ref pour accès synchrone à l'ID créé (les state updates sont async).
  const justCreatedIdRef = useRef<string | null>(null)

  // Horaires personnalisés pour l'événement en cours d'édition.
  const { schedules: daySchedules, upsertSchedule } = useEventDaySchedules(
    editing?.id ?? null,
  )

  function openCreate(): void {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(event: EventRow): void {
    setEditing(event)
    setFormOpen(true)
  }

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorMessage onRetry={refetch} />

  return (
    <div>
      <PageHeader
        title="Événements"
        description="Gérez les éditions de vos événements."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouvel événement
          </Button>
        }
      />

      {events.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">Aucun événement n'a encore été créé.</p>
          <Button className="mt-4" onClick={openCreate}>
            Créer le premier événement
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Card key={event.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-800">
                      {event.name}
                    </h2>
                    {event.is_active && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">
                    {formatEventDateRange(event.start_date, event.end_date)}
                    {event.location ? ` · ${event.location}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!event.is_active && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setToActivate(event)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Activer
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(event)}
                    aria-label={`Modifier ${event.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setToDelete(event)}
                    aria-label={`Supprimer ${event.name}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EventForm
        open={formOpen}
        event={editing}
        daySchedules={daySchedules}
        onOpenChange={setFormOpen}
        onSubmit={async (values) => {
          if (editing) return updateEvent(editing.id, values)
          const isFirst = events.length === 0
          const id = await createEvent(values)
          if (id !== null) {
            justCreatedIdRef.current = id
            if (isFirst) {
              // Premier événement : activé automatiquement.
              await activateEvent(id)
              setPostCreationEventId(id)
            } else {
              // Sinon, on demande explicitement via une modale.
              setActivateAskId(id)
            }
            return true
          }
          return false
        }}
        onSubmitDaySchedules={async (schedules) => {
          // Utilise la ref (synchrone) plutôt que le state (async) pour l'ID créé.
          const eventId = editing?.id ?? justCreatedIdRef.current
          if (!eventId) return
          for (const s of schedules) {
            await upsertSchedule(eventId, s.date, s.open_time, s.close_time)
          }
        }}
        onCreated={() => {
          setFormOpen(false)
        }}
      />

      <ConfirmDialog
        open={activateAskId !== null}
        title="Activer ce nouvel événement ?"
        description="Il deviendra l'édition visible par les bénévoles. L'édition active actuelle sera désactivée."
        confirmLabel="Activer"
        cancelLabel="Plus tard"
        onConfirm={async () => {
          if (activateAskId) await activateEvent(activateAskId)
        }}
        onOpenChange={(o) => {
          if (!o) {
            // Quel que soit le choix, on enchaîne sur le workflow post-création.
            const id = activateAskId
            setActivateAskId(null)
            if (id) setPostCreationEventId(id)
          }
        }}
      />

      <PostCreationDialog
        open={postCreationEventId !== null}
        title="Événement créé !"
        actions={[
          {
            label: 'Créer les stands de cet événement',
            onClick: () => {
              navigate(`/admin/stands?eventId=${postCreationEventId}`)
              setPostCreationEventId(null)
            },
          },
          {
            label: 'Créer un autre événement',
            variant: 'outline',
            onClick: () => {
              setPostCreationEventId(null)
              openCreate()
            },
          },
          {
            label: 'Terminer',
            variant: 'outline',
            onClick: () => setPostCreationEventId(null),
          },
        ]}
        onOpenChange={(o) => {
          if (!o) setPostCreationEventId(null)
        }}
      />

      <ConfirmDialog
        open={toActivate !== null}
        title="Activer cette édition ?"
        description={
          toActivate
            ? `« ${toActivate.name} » deviendra l'édition visible par les bénévoles. L'édition active actuelle sera désactivée.`
            : undefined
        }
        confirmLabel="Activer"
        onConfirm={async () => {
          if (toActivate) await activateEvent(toActivate.id)
        }}
        onOpenChange={(open) => {
          if (!open) setToActivate(null)
        }}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cet événement ?"
        description={
          toDelete
            ? `« ${toDelete.name} » et tous ses stands, créneaux et inscriptions seront supprimés définitivement.`
            : undefined
        }
        confirmLabel="Supprimer"
        destructive
        onConfirm={async () => {
          if (toDelete) await deleteEvent(toDelete.id)
        }}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
      />
    </div>
  )
}

import { useState } from 'react'
import { CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEvents } from '@/hooks/useEvents'
import { EventForm } from '@/components/admin/EventForm'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatEventDate } from '@/lib/date-utils'
import type { EventRow } from '@/lib/domain'

export function Events() {
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
        description="Gérez les éditions de la kermesse."
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
                    {formatEventDate(event.date)}
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
        onOpenChange={setFormOpen}
        onSubmit={(values) =>
          editing ? updateEvent(editing.id, values) : createEvent(values)
        }
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

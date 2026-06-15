import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useActiveEvent, useEventById } from '@/hooks/useActiveEvent'
import { useStands } from '@/hooks/useStands'
import { useStandMutations } from '@/hooks/useStandMutations'
import { useSlotMutations } from '@/hooks/useSlotMutations'
import { useEventDaySchedules } from '@/hooks/useEventDaySchedules'
import { StandForm } from '@/components/admin/StandForm'
import { PostCreationDialog } from '@/components/admin/PostCreationDialog'
import { AutoGenerateSlotsDialog } from '@/components/admin/AutoGenerateSlotsDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { StandRow } from '@/lib/domain'

interface AutoGenerateState {
  standId: string
  standDate: string
  count: number
  duration: number
}

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
  const { createSlots } = useSlotMutations(refetch)
  const { schedules: daySchedules } = useEventDaySchedules(eventId)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<StandRow | null>(null)
  const [toDelete, setToDelete] = useState<StandRow | null>(null)
  const [postCreationStandId, setPostCreationStandId] = useState<string | null>(null)
  const [autoGenerate, setAutoGenerate] = useState<AutoGenerateState | null>(null)

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

  function openEdit(stand: StandRow): void {
    setEditing(stand)
    setFormOpen(true)
  }

  const autoGenerateStand = autoGenerate
    ? stands.find((s) => s.id === autoGenerate.standId) ?? null
    : null

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
          {stands.map((stand) => (
            <Card key={stand.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
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
                      {stand.date ? ` · ${stand.date}` : ''}
                      {stand.location_detail ? ` · ${stand.location_detail}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <StandForm
        open={formOpen}
        stand={editing}
        eventId={event.id}
        eventStartDate={event.start_date}
        eventEndDate={event.end_date}
        onOpenChange={setFormOpen}
        onSubmit={async (values) => {
          if (editing) return updateStand(editing.id, values)
          const id = await createStand(values)
          if (id !== null) {
            setPostCreationStandId(id)
            return true
          }
          return false
        }}
        onCreated={() => setFormOpen(false)}
        onAutoGenerate={(config) => {
          if (postCreationStandId) {
            setAutoGenerate({
              standId: postCreationStandId,
              standDate: config.standDate,
              count: config.count,
              duration: config.duration,
            })
            setPostCreationStandId(null)
          }
        }}
      />

      <PostCreationDialog
        open={postCreationStandId !== null}
        title="Stand créé !"
        actions={[
          {
            label: 'Créer les créneaux de ce stand',
            onClick: () => {
              navigate(`/admin/slots?standId=${postCreationStandId}`)
              setPostCreationStandId(null)
            },
          },
          {
            label: 'Générer des créneaux automatiquement',
            onClick: () => {
              const stand = stands.find((s) => s.id === postCreationStandId)
              if (postCreationStandId) {
                setAutoGenerate({
                  standId: postCreationStandId,
                  standDate: stand?.date ?? event.start_date,
                  count: 4,
                  duration: 60,
                })
              }
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

      {autoGenerate && (
        <AutoGenerateSlotsDialog
          open={true}
          standId={autoGenerate.standId}
          standDate={autoGenerate.standDate}
          eventRow={event}
          daySchedules={daySchedules}
          existingSlots={autoGenerateStand?.kermesse_slots ?? []}
          onGenerate={createSlots}
          onOpenChange={(o) => {
            if (!o) setAutoGenerate(null)
          }}
        />
      )}

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

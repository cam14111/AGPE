import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { useActiveEvent } from '@/hooks/useActiveEvent'
import { useAuditLog, type AuditEntry } from '@/hooks/useAuditLog'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateTime, formatTime } from '@/lib/date-utils'

function ActionBadge({ action }: { action: AuditEntry['action'] }) {
  switch (action) {
    case 'signup':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
          Inscription
        </Badge>
      )
    case 'replacement':
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
          Remplacement
        </Badge>
      )
    case 'unsignup':
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200">
          Désinscription
        </Badge>
      )
    case 'auto_reserved':
      return (
        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
          Autoréservation
        </Badge>
      )
  }
}

function actorLabel(entry: AuditEntry): string {
  if (entry.actor_kind === 'system') return 'Automatique (désistement)'
  if (entry.actor_kind === 'admin') return `Admin : ${entry.actor_name ?? '—'}`
  return 'Le bénévole'
}

export function History() {
  const { event, loading: eventLoading } = useActiveEvent()
  const eventId = event?.id ?? null
  const { entries, loading, error, refetch, reset } = useAuditLog(eventId)
  const [confirmReset, setConfirmReset] = useState(false)

  if (eventLoading) return <LoadingSkeleton />

  if (!event) {
    return (
      <div>
        <PageHeader title="Historique" />
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

  return (
    <div>
      <PageHeader
        title="Historique"
        description={`Toutes les actions — ${event.name}`}
        action={
          <Button
            variant="outline"
            onClick={() => setConfirmReset(true)}
            disabled={entries.length === 0}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
            Réinitialiser
          </Button>
        }
      />

      {error ? (
        <ErrorMessage onRetry={refetch} />
      ) : loading ? (
        <LoadingSkeleton />
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">Aucune action enregistrée pour le moment.</p>
          <p className="text-sm mt-2">
            Les inscriptions, désinscriptions et remplacements apparaîtront ici.
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Par qui</TableHead>
                  <TableHead>Prénom</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Stand</TableHead>
                  <TableHead>Créneau</TableHead>
                  <TableHead>Date et heure</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <ActionBadge action={e.action} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {actorLabel(e)}
                    </TableCell>
                    <TableCell>{e.first_name ?? '—'}</TableCell>
                    <TableCell>{e.last_name ?? '—'}</TableCell>
                    <TableCell>{e.stand_name ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {e.slot_start && e.slot_end
                        ? `${formatTime(e.slot_start)} → ${formatTime(e.slot_end)}`
                        : '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(e.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmReset}
        title="Réinitialiser l'historique ?"
        description="Toutes les entrées d'historique de cette édition seront supprimées définitivement. Les inscriptions en cours ne sont pas affectées."
        confirmLabel="Tout supprimer"
        destructive
        onConfirm={async () => {
          await reset()
        }}
        onOpenChange={setConfirmReset}
      />
    </div>
  )
}

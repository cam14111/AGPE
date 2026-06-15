import { useState } from 'react'
import { ShieldCheck, ShieldMinus, ShieldPlus } from 'lucide-react'
import { useMembers, type Member } from '@/hooks/useMembers'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface PendingAction {
  member: Member
  role: 'admin' | 'volunteer'
}

function memberLabel(member: Member): string {
  const name = [member.firstName, member.lastName].filter(Boolean).join(' ').trim()
  return name || member.email || 'Membre'
}

export function Roles() {
  const { members, adminCount, loading, error, refetch, setRole } = useMembers()
  const [pending, setPending] = useState<PendingAction | null>(null)

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorMessage onRetry={refetch} />

  return (
    <div>
      <PageHeader
        title="Administrateurs"
        description="Gérez qui peut administrer les événements. Il doit toujours rester au moins un administrateur."
      />

      {members.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">Aucun membre pour le moment.</p>
          <p className="text-sm mt-2">
            Les parents apparaissent ici après leur première connexion.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => {
            const isAdmin = member.role === 'admin'
            // On ne peut pas rétrograder le dernier administrateur.
            const isLastAdmin = isAdmin && adminCount <= 1
            return (
              <Card key={member.userId}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck
                      className={isAdmin ? 'h-5 w-5 text-primary' : 'h-5 w-5 text-slate-300'}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-base font-semibold text-slate-800">
                        {memberLabel(member)}
                      </p>
                      {member.email && (
                        <p className="text-xs text-slate-400">{member.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isAdmin ? (
                      <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
                        Administrateur
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Bénévole</Badge>
                    )}

                    {isAdmin ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isLastAdmin}
                        title={
                          isLastAdmin
                            ? 'Il doit rester au moins un administrateur.'
                            : undefined
                        }
                        onClick={() =>
                          setPending({ member, role: 'volunteer' })
                        }
                      >
                        <ShieldMinus className="h-4 w-4" />
                        Rétrograder
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setPending({ member, role: 'admin' })}
                      >
                        <ShieldPlus className="h-4 w-4" />
                        Promouvoir admin
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={
          pending?.role === 'admin'
            ? 'Promouvoir cet utilisateur administrateur ?'
            : 'Rétrograder cet administrateur ?'
        }
        description={
          pending
            ? pending.role === 'admin'
              ? `${memberLabel(pending.member)} aura accès à toute l'administration des événements.`
              : `${memberLabel(pending.member)} redeviendra un bénévole sans accès admin.`
            : undefined
        }
        confirmLabel={pending?.role === 'admin' ? 'Promouvoir' : 'Rétrograder'}
        destructive={pending?.role === 'volunteer'}
        onConfirm={async () => {
          if (pending) await setRole(pending.member.userId, pending.role)
        }}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
      />
    </div>
  )
}

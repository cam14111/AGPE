import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ParticipantTag } from '@/components/admin/ParticipantTag'
import { formatEventDate, formatTime } from '@/lib/date-utils'
import { participantLabel } from '@/lib/participant'
import { cn } from '@/lib/utils'
import type { SlotRow, StandWithSlots } from '@/lib/domain'
import type { AdminSignupDetail } from '@/hooks/useAdminSignups'
import type { NowParts } from '@/lib/live-board'

interface StandRecapCardProps {
  stand: StandWithSlots
  participantsBySlot: Map<string, AdminSignupDetail[]>
  now: NowParts
}

// Carte récapitulative d'un stand : créneaux groupés par jour, avec les inscrits
// (réservés + remplaçants) et surlignage du créneau en cours.
export function StandRecapCard({ stand, participantsBySlot, now }: StandRecapCardProps) {
  const slotsByDay = new Map<string, SlotRow[]>()
  for (const slot of stand.kermesse_slots) {
    const key = slot.date ?? ''
    const list = slotsByDay.get(key) ?? []
    list.push(slot)
    slotsByDay.set(key, list)
  }
  const days = [...slotsByDay.keys()].sort((a, b) => a.localeCompare(b))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <span aria-hidden="true">{stand.emoji ?? '🎪'}</span>
          {stand.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stand.kermesse_slots.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun créneau.</p>
        ) : (
          days.map((day) => (
            <div key={day || 'sans-date'}>
              {day && (
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {formatEventDate(day)}
                </p>
              )}
              <ul className="space-y-1">
                {slotsByDay.get(day)!.map((slot) => {
                  const all = participantsBySlot.get(slot.id) ?? []
                  const reserved = all.filter((p) => p.status === 'reserved')
                  const replacements = all.filter((p) => p.status === 'replacement')
                  const isCurrent =
                    day === now.date &&
                    slot.start_time <= now.time &&
                    now.time < slot.end_time
                  return (
                    <li
                      key={slot.id}
                      className={cn(
                        'rounded-md border px-3 py-2',
                        isCurrent
                          ? 'border-primary bg-primary/5'
                          : 'border-slate-100',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium tabular-nums">
                          {formatTime(slot.start_time)} → {formatTime(slot.end_time)}
                          {isCurrent && (
                            <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">
                              en cours
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-slate-400">
                          {reserved.length}/{slot.max_volunteers}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {reserved.length === 0 && replacements.length === 0 ? (
                          <span className="text-xs italic text-amber-600">
                            Personne inscrit
                          </span>
                        ) : (
                          <>
                            {reserved.map((p) => (
                              <ParticipantTag key={p.signup_id} label={participantLabel(p)} />
                            ))}
                            {replacements.map((p) => (
                              <ParticipantTag
                                key={p.signup_id}
                                label={participantLabel(p)}
                                replacement
                              />
                            ))}
                          </>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

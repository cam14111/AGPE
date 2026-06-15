import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { cn } from '@/lib/utils'
import { isDateInRange } from '@/lib/date-utils'
import type { StandRow } from '@/lib/domain'
import type { TablesInsert } from '@agpe/shared/types/supabase'

const EMOJI_CHOICES = [
  '🎯', '🎪', '🎨', '🍿', '🧁', '🎲', '🎣', '🎡',
  '🍭', '🏀', '🎶', '🤡', '🎟️', '🍦', '🪀', '🎈',
]

interface AutoGenerateConfig {
  count: number
  duration: number
  standDate: string
}

interface StandFormValues {
  name: string
  date: string
  description: string
  location_detail: string
  emoji: string
  autoGenerate: boolean
  autoCount: string
  autoDuration: string
}

interface StandFormProps {
  open: boolean
  stand: StandRow | null
  eventId: string
  eventStartDate: string
  eventEndDate: string
  onOpenChange: (open: boolean) => void
  onSubmit: (values: TablesInsert<'kermesse_stands'>) => Promise<boolean>
  onCreated?: () => void
  onAutoGenerate?: (config: AutoGenerateConfig) => void
}

function toForm(stand: StandRow | null, eventStartDate: string): StandFormValues {
  return {
    name: stand?.name ?? '',
    date: stand?.date ?? eventStartDate,
    description: stand?.description ?? '',
    location_detail: stand?.location_detail ?? '',
    emoji: stand?.emoji ?? '🎯',
    autoGenerate: false,
    autoCount: '4',
    autoDuration: '60',
  }
}

// Modale de création / édition d'un stand avec date et option de génération automatique.
export function StandForm({
  open,
  stand,
  eventId,
  eventStartDate,
  eventEndDate,
  onOpenChange,
  onSubmit,
  onCreated,
  onAutoGenerate,
}: StandFormProps) {
  const [values, setValues] = useState<StandFormValues>(toForm(stand, eventStartDate))
  const [saving, setSaving] = useState(false)
  const [dateWarnOpen, setDateWarnOpen] = useState(false)
  const [pendingSubmit, setPendingSubmit] = useState(false)

  const isCreating = stand === null

  useEffect(() => {
    if (open) setValues(toForm(stand, eventStartDate))
  }, [open, stand, eventStartDate])

  function update(field: keyof StandFormValues, value: string | boolean): void {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  const dateOutOfRange =
    eventStartDate && eventEndDate && values.date
      ? !isDateInRange(values.date, eventStartDate, eventEndDate)
      : false

  async function doSubmit(): Promise<void> {
    setSaving(true)
    try {
      const ok = await onSubmit({
        event_id: eventId,
        name: values.name.trim(),
        date: values.date || null,
        description: values.description.trim() || null,
        location_detail: values.location_detail.trim() || null,
        emoji: values.emoji || null,
      })

      if (!ok) return

      if (isCreating && values.autoGenerate && onAutoGenerate) {
        onAutoGenerate({
          count: Number.parseInt(values.autoCount, 10) || 4,
          duration: Number.parseInt(values.autoDuration, 10) || 60,
          standDate: values.date,
        })
      }

      if (onCreated) {
        onCreated()
      } else {
        onOpenChange(false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (dateOutOfRange && !pendingSubmit) {
      setPendingSubmit(true)
      setDateWarnOpen(true)
      return
    }
    await doSubmit()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {stand ? 'Modifier le stand' : 'Nouveau stand'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stand-name">Nom</Label>
              <Input
                id="stand-name"
                required
                value={values.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Pêche aux canards"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stand-date">Date d'ouverture</Label>
              <Input
                id="stand-date"
                type="date"
                required
                value={values.date}
                onChange={(e) => { update('date', e.target.value); setPendingSubmit(false) }}
              />
              {dateOutOfRange && (
                <p className="text-xs text-amber-600">
                  Cette date est en dehors de la période de l'événement.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Emoji</Label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Choix de l'emoji">
                {EMOJI_CHOICES.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => update('emoji', emoji)}
                    aria-label={`Emoji ${emoji}`}
                    aria-pressed={values.emoji === emoji}
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-md border text-xl',
                      values.emoji === emoji
                        ? 'border-primary ring-2 ring-primary'
                        : 'border-input hover:bg-accent',
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stand-location">Emplacement</Label>
              <Input
                id="stand-location"
                value={values.location_detail}
                onChange={(e) => update('location_detail', e.target.value)}
                placeholder="Salle des fêtes — côté jardin"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stand-description">Description</Label>
              <Textarea
                id="stand-description"
                value={values.description}
                onChange={(e) => update('description', e.target.value)}
              />
            </div>

            {/* Option de génération automatique (création uniquement) */}
            {isCreating && onAutoGenerate && (
              <div className="space-y-3 rounded-md border p-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={values.autoGenerate}
                    onChange={(e) => update('autoGenerate', e.target.checked)}
                    className="h-4 w-4"
                  />
                  Générer des créneaux automatiquement
                </label>

                {values.autoGenerate && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="auto-count" className="text-xs">
                        Nombre de créneaux
                      </Label>
                      <Input
                        id="auto-count"
                        type="number"
                        min={1}
                        value={values.autoCount}
                        onChange={(e) => update('autoCount', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="auto-duration" className="text-xs">
                        Durée (minutes)
                      </Label>
                      <Input
                        id="auto-duration"
                        type="number"
                        min={1}
                        value={values.autoDuration}
                        onChange={(e) => update('autoDuration', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={saving} aria-busy={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={dateWarnOpen}
        title="Date hors période de l'événement"
        description="La date d'ouverture de ce stand est en dehors de la période de l'événement. Voulez-vous quand même continuer ?"
        confirmLabel="Continuer"
        onConfirm={async () => {
          setDateWarnOpen(false)
          await doSubmit()
        }}
        onOpenChange={(o) => {
          if (!o) {
            setDateWarnOpen(false)
            setPendingSubmit(false)
          }
        }}
      />
    </>
  )
}

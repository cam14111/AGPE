import { cn } from '@/lib/utils'

interface ParticipantTagProps {
  label: string
  replacement?: boolean
}

// Puce d'inscrit en lecture seule (réservé = slate, remplaçant = ambre).
// Variante sans bouton de la ParticipantChip, pour les écrans de consultation.
export function ParticipantTag({ label, replacement = false }: ParticipantTagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
        replacement ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700',
      )}
    >
      {label}
      {replacement && <span className="opacity-70">· rempl.</span>}
    </span>
  )
}

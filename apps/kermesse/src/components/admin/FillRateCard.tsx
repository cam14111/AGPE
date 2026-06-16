import type * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface FillRateCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  progress?: number
  danger?: boolean
  onClick?: () => void
  active?: boolean
  ariaLabel?: string
}

// Carte d'indicateur clé du tableau de bord. Devient un bouton de filtre
// cliquable lorsque `onClick` est fourni.
export function FillRateCard({
  label,
  value,
  icon: Icon,
  progress,
  danger = false,
  onClick,
  active = false,
  ariaLabel,
}: FillRateCardProps) {
  const interactive = onClick !== undefined

  return (
    <Card
      className={cn(
        interactive &&
          'cursor-pointer transition hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        interactive && active && 'border-primary bg-primary/5 ring-2 ring-primary',
      )}
      {...(interactive
        ? {
            role: 'button',
            tabIndex: 0,
            'aria-pressed': active,
            'aria-label': ariaLabel,
            onClick,
            onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            },
          }
        : {})}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">{label}</span>
          <Icon
            className={cn('h-5 w-5', danger ? 'text-red-500' : 'text-slate-400')}
            aria-hidden="true"
          />
        </div>
        <p
          className={cn(
            'mt-2 text-2xl font-bold',
            danger ? 'text-red-600' : 'text-slate-900',
          )}
        >
          {value}
        </p>
        {progress !== undefined && (
          <Progress value={progress} className="mt-3" />
        )}
      </CardContent>
    </Card>
  )
}

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Action {
  label: string
  variant?: 'default' | 'outline'
  onClick: () => void
}

interface PostCreationDialogProps {
  open: boolean
  title: string
  actions: Action[]
  onOpenChange: (open: boolean) => void
}

// Dialogue affiché après une création réussie pour proposer les étapes suivantes.
export function PostCreationDialog({
  open,
  title,
  actions,
  onOpenChange,
}: PostCreationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant ?? 'default'}
              onClick={() => {
                onOpenChange(false)
                action.onClick()
              }}
              className="w-full"
            >
              {action.label}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

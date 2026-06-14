import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/date-utils";
import type { SlotRow as Slot } from "@/hooks/useSlots";
interface Props {
  slot: Slot;
  currentCount: number;
  isSignedUp: boolean;
  onSignup: (slotId: string) => Promise<void>;
  onUnsignup: (slotId: string) => Promise<void>;
  isPastEvent: boolean;
}
export function SlotRow({
  slot,
  currentCount,
  isSignedUp,
  onSignup,
  onUnsignup,
  isPastEvent,
}: Props) {
  const isFull = currentCount >= slot.max_volunteers;
  const remaining = slot.max_volunteers - currentCount;
  async function handleClick(): Promise<void> {
    try {
      if (isSignedUp) await onUnsignup(slot.id);
      else await onSignup(slot.id);
    } catch {
      toast.error("Une erreur est survenue. Réessayez dans quelques instants.");
    }
  }
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-3">
      <div>
        <p className="text-sm font-medium">
          {formatTime(slot.start_time)} → {formatTime(slot.end_time)}
        </p>
        <p className="text-xs text-slate-500">
          {currentCount} / {slot.max_volunteers} bénévole(s)
        </p>
      </div>
      <Badge
        variant={isFull ? "destructive" : undefined}
        className={
          !isFull
            ? remaining / slot.max_volunteers <= 0.25
              ? "border-orange-200 bg-orange-100 text-orange-700"
              : "border-emerald-200 bg-emerald-100 text-emerald-700"
            : undefined
        }
      >
        {isFull ? "Complet" : `${remaining} place${remaining > 1 ? "s" : ""}`}
      </Badge>
      <Button
        variant={isSignedUp ? "outline" : "default"}
        disabled={(isFull && !isSignedUp) || isPastEvent}
        onClick={() => void handleClick()}
      >
        {isSignedUp ? "Se désinscrire" : "S'inscrire"}
      </Button>
    </div>
  );
}

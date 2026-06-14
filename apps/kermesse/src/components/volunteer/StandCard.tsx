import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlotRow } from "./SlotRow";
import type { StandRow } from "@/hooks/useStands";
import type { SlotRow as Slot } from "@/hooks/useSlots";
import type { SignupRow } from "@/hooks/useSignups";
interface Props {
  stand: StandRow;
  slots: Slot[];
  signups: SignupRow[];
  userId: string;
  onSignup: (id: string) => Promise<void>;
  onUnsignup: (id: string) => Promise<void>;
  isPastEvent: boolean;
}
export function StandCard({
  stand,
  slots,
  signups,
  userId,
  onSignup,
  onUnsignup,
  isPastEvent,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="mr-2 text-3xl">{stand.emoji ?? "🎯"}</span>
          {stand.name}
        </CardTitle>
        <p className="text-xs text-slate-400">{stand.location_detail}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">{stand.description}</p>
        {slots.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aucun créneau n'a encore été créé.
          </p>
        ) : (
          slots.map((slot) => (
            <SlotRow
              key={slot.id}
              slot={slot}
              currentCount={signups.filter((s) => s.slot_id === slot.id).length}
              isSignedUp={signups.some(
                (s) => s.slot_id === slot.id && s.user_id === userId,
              )}
              onSignup={onSignup}
              onUnsignup={onUnsignup}
              isPastEvent={isPastEvent}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

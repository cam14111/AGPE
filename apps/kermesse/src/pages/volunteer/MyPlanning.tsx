import { supabase } from "@agpe/shared/supabase-client";
import { useAuth } from "@agpe/shared/auth/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { useActiveEvent } from "@/hooks/useActiveEvent";
import { useStands } from "@/hooks/useStands";
import { useSlots } from "@/hooks/useSlots";
import { useSignups } from "@/hooks/useSignups";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatTime, isPastDate } from "@/lib/date-utils";
export function MyPlanning() {
  const { user } = useAuth();
  const { event } = useActiveEvent();
  const { stands } = useStands(event?.id);
  const { slots } = useSlots(stands.map((s) => s.id));
  const { signups, refetch } = useSignups(slots.map((s) => s.id));
  const mine = signups.filter((s) => s.user_id === user?.id);
  async function remove(slotId: string): Promise<void> {
    if (!user) return;
    await supabase
      .from("kermesse_signups")
      .delete()
      .eq("slot_id", slotId)
      .eq("user_id", user.id);
    await refetch();
  }
  return (
    <>
      <PageHeader title="Mon planning" />
      <main className="safe-bottom mx-auto max-w-2xl space-y-4 p-4">
        {mine.length === 0 ? (
          <p className="py-12 text-center text-slate-500">
            Vous n'êtes inscrit sur aucun créneau.
          </p>
        ) : (
          mine.map((signup) => {
            const slot = slots.find((s) => s.id === signup.slot_id);
            const stand = stands.find((s) => s.id === slot?.stand_id);
            return (
              <Card key={signup.id}>
                <CardContent className="flex items-center justify-between pt-4">
                  <div>
                    <p className="font-semibold">
                      {stand?.emoji} {stand?.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {slot
                        ? `${formatTime(slot.start_time)} → ${formatTime(slot.end_time)}`
                        : ""}
                    </p>
                  </div>
                  {!isPastDate(event?.date) && slot ? (
                    <Button
                      variant="outline"
                      onClick={() => void remove(slot.id)}
                    >
                      Se désinscrire
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        )}
      </main>
    </>
  );
}

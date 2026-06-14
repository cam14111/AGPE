import { toast } from "sonner";
import { supabase } from "@agpe/shared/supabase-client";
import { useAuth } from "@agpe/shared/auth/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useActiveEvent } from "@/hooks/useActiveEvent";
import { useStands } from "@/hooks/useStands";
import { useSlots } from "@/hooks/useSlots";
import { useSignups } from "@/hooks/useSignups";
import { StandCard } from "@/components/volunteer/StandCard";
import { formatDate, isPastDate } from "@/lib/date-utils";
export function StandsList() {
  const { user } = useAuth();
  const { event, loading } = useActiveEvent();
  const { stands } = useStands(event?.id);
  const { slots, refetch: refetchSlots } = useSlots(stands.map((s) => s.id));
  const { signups, refetch } = useSignups(slots.map((s) => s.id));
  async function signup(slotId: string): Promise<void> {
    if (!user) return;
    const { error } = await supabase
      .from("kermesse_signups")
      .insert({ slot_id: slotId, user_id: user.id });
    if (error) {
      toast.error(
        error.message.includes("Créneau complet")
          ? "Ce créneau vient d’être complet. Choisissez un autre créneau."
          : "Inscription impossible.",
      );
      return;
    }
    toast.success("Inscription confirmée ✓");
    await refetch();
  }
  async function unsignup(slotId: string): Promise<void> {
    if (!user) return;
    await supabase
      .from("kermesse_signups")
      .delete()
      .eq("slot_id", slotId)
      .eq("user_id", user.id);
    toast.success("Désinscription enregistrée.");
    await refetch();
    await refetchSlots();
  }
  if (loading) return <LoadingSkeleton />;
  return (
    <>
      <PageHeader title="Stands" />
      <main className="safe-bottom mx-auto max-w-2xl space-y-4 p-4">
        {event ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-4">
              <h1 className="text-2xl font-bold">{event.name}</h1>
              <p className="text-sm text-slate-600">
                {formatDate(event.date)} · {event.location}
              </p>
            </CardContent>
          </Card>
        ) : (
          <p>Aucune kermesse active pour le moment.</p>
        )}
        {stands.map((stand) => (
          <StandCard
            key={stand.id}
            stand={stand}
            slots={slots.filter((slot) => slot.stand_id === stand.id)}
            signups={signups}
            userId={user?.id ?? ""}
            onSignup={signup}
            onUnsignup={unsignup}
            isPastEvent={isPastDate(event?.date)}
          />
        ))}
      </main>
    </>
  );
}

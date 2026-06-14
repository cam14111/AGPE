import { useState, FormEvent } from "react";
import { supabase } from "@agpe/shared/supabase-client";
import { PageHeader } from "@/components/shared/PageHeader";
import { useActiveEvent } from "@/hooks/useActiveEvent";
import { useStands } from "@/hooks/useStands";
import { useSlots } from "@/hooks/useSlots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function Slots() {
  const { event } = useActiveEvent();
  const { stands } = useStands(event?.id);
  const { slots, refetch } = useSlots(stands.map((s) => s.id));
  const [standId, setStandId] = useState("");
  async function create(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await supabase.from("kermesse_slots").insert({
      stand_id: standId,
      start_time: String(form.get("start")),
      end_time: String(form.get("end")),
      max_volunteers: Number(form.get("max")),
    });
    await refetch();
  }
  return (
    <>
      <PageHeader title="Créneaux" />
      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <form
          onSubmit={(e) => void create(e)}
          className="grid gap-2 rounded-xl bg-white p-4"
        >
          <select
            className="rounded-md border p-2"
            value={standId}
            onChange={(e) => setStandId(e.target.value)}
            required
          >
            <option value="">Choisir un stand</option>
            {stands.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Input name="start" type="time" required />
          <Input name="end" type="time" required />
          <Input name="max" type="number" min={1} defaultValue={1} />
          <Button>Créer le créneau</Button>
        </form>
        {slots.map((slot) => (
          <div key={slot.id} className="rounded-lg bg-white p-3 text-sm">
            {stands.find((s) => s.id === slot.stand_id)?.name} ·{" "}
            {slot.start_time} → {slot.end_time} · max {slot.max_volunteers}
          </div>
        ))}
      </main>
    </>
  );
}

import { useState, FormEvent } from "react";
import { supabase } from "@agpe/shared/supabase-client";
import { PageHeader } from "@/components/shared/PageHeader";
import { useActiveEvent } from "@/hooks/useActiveEvent";
import { useStands } from "@/hooks/useStands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
export function Stands() {
  const { event } = useActiveEvent();
  const { stands, refetch } = useStands(event?.id);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  async function create(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!event) return;
    await supabase
      .from("kermesse_stands")
      .insert({ event_id: event.id, name, emoji });
    setName("");
    await refetch();
  }
  async function remove(id: string): Promise<void> {
    await supabase.from("kermesse_stands").delete().eq("id", id);
    await refetch();
  }
  return (
    <>
      <PageHeader title="Stands" />
      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <form
          onSubmit={(e) => void create(e)}
          className="grid gap-2 rounded-xl bg-white p-4"
        >
          <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} />
          <Input
            required
            placeholder="Nom du stand"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button>Nouveau stand</Button>
        </form>
        {stands.map((stand) => (
          <Card key={stand.id}>
            <CardContent className="flex justify-between pt-4">
              <span>
                {stand.emoji} {stand.name}
              </span>
              <Button
                variant="destructive"
                onClick={() => void remove(stand.id)}
              >
                Supprimer
              </Button>
            </CardContent>
          </Card>
        ))}
      </main>
    </>
  );
}

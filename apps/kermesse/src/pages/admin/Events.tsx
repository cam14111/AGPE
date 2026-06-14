import { useEffect, useState, FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@agpe/shared/supabase-client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@agpe/shared/types/supabase";
type EventRow = Database["public"]["Tables"]["kermesse_events"]["Row"];
export function Events() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  async function load(): Promise<void> {
    const { data } = await supabase
      .from("kermesse_events")
      .select("*")
      .order("date", { ascending: false });
    setEvents(data ?? []);
  }
  useEffect(() => {
    void load();
  }, []);
  async function create(e: FormEvent): Promise<void> {
    e.preventDefault();
    const { error } = await supabase
      .from("kermesse_events")
      .insert({ name, date });
    if (error) toast.error("Création impossible.");
    else {
      setName("");
      setDate("");
      await load();
    }
  }
  async function activate(id: string): Promise<void> {
    const { error } = await supabase
      .from("kermesse_events")
      .update({ is_active: true })
      .eq("id", id);
    if (error) toast.error("Désactivez d’abord l’événement actif existant.");
    await load();
  }
  async function remove(id: string): Promise<void> {
    await supabase.from("kermesse_events").delete().eq("id", id);
    await load();
  }
  return (
    <>
      <PageHeader title="Événements" />
      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <form
          onSubmit={(e) => void create(e)}
          className="grid gap-2 rounded-xl bg-white p-4"
        >
          <Input
            required
            placeholder="Nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Textarea placeholder="Description" />
          <Button>Créer l'événement</Button>
        </form>
        {events.map((ev) => (
          <Card key={ev.id}>
            <CardContent className="flex items-center justify-between pt-4">
              <div>
                <b>{ev.name}</b>
                <p className="text-sm text-slate-500">
                  {ev.date} {ev.is_active ? "· actif" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => void activate(ev.id)}>
                  Activer
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void remove(ev.id)}
                >
                  Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </>
  );
}

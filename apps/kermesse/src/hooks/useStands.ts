import { useEffect, useState } from "react";
import { supabase } from "@agpe/shared/supabase-client";
import type { Database } from "@agpe/shared/types/supabase";
export type StandRow = Database["public"]["Tables"]["kermesse_stands"]["Row"];
export function useStands(eventId?: string) {
  const [stands, setStands] = useState<StandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  async function refetch(): Promise<void> {
    if (!eventId) {
      setStands([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("kermesse_stands")
      .select("*")
      .eq("event_id", eventId)
      .order("name");
    setStands(data ?? []);
    setError(err?.message ?? null);
    setLoading(false);
  }
  useEffect(() => {
    void refetch();
  }, [eventId]);
  return { stands, loading, error, refetch };
}

import { useEffect, useState } from "react";
import { supabase } from "@agpe/shared/supabase-client";
import type { Database } from "@agpe/shared/types/supabase";
type EventRow = Database["public"]["Tables"]["kermesse_events"]["Row"];
export function useActiveEvent() {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  async function refetch(): Promise<void> {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("kermesse_events")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();
    setEvent(data);
    setError(err?.message ?? null);
    setLoading(false);
  }
  useEffect(() => {
    void refetch();
  }, []);
  return { event, loading, error, refetch };
}

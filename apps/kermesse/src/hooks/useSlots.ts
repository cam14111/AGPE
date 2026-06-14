import { useEffect, useState } from "react";
import { supabase } from "@agpe/shared/supabase-client";
import type { Database } from "@agpe/shared/types/supabase";
export type SlotRow = Database["public"]["Tables"]["kermesse_slots"]["Row"];
export function useSlots(standIds: string[]) {
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  async function refetch(): Promise<void> {
    if (standIds.length === 0) {
      setSlots([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("kermesse_slots")
      .select("*")
      .in("stand_id", standIds)
      .order("start_time");
    setSlots(data ?? []);
    setError(err?.message ?? null);
    setLoading(false);
  }
  useEffect(() => {
    void refetch();
  }, [standIds.join(",")]);
  return { slots, loading, error, refetch };
}

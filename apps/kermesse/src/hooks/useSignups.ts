import { useEffect, useState } from "react";
import { supabase } from "@agpe/shared/supabase-client";
import type { Database } from "@agpe/shared/types/supabase";
export type SignupRow = Database["public"]["Tables"]["kermesse_signups"]["Row"];
export function useSignups(slotIds: string[]) {
  const [signups, setSignups] = useState<SignupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  async function refetch(): Promise<void> {
    if (slotIds.length === 0) {
      setSignups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("kermesse_signups")
      .select("*")
      .in("slot_id", slotIds);
    setSignups(data ?? []);
    setError(err?.message ?? null);
    setLoading(false);
  }
  useEffect(() => {
    void refetch();
  }, [slotIds.join(",")]);
  return { signups, loading, error, refetch };
}

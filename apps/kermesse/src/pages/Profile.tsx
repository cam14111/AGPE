import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@agpe/shared/supabase-client";
import { useAuth } from "@agpe/shared/auth/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function Profile() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  useEffect(() => {
    async function load(): Promise<void> {
      if (!user) return;
      const { data } = await supabase
        .from("agpe_users_profile")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setFirstName(data?.first_name ?? "");
      setLastName(data?.last_name ?? "");
    }
    void load();
  }, [user]);
  async function save(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!user) return;
    await supabase
      .from("agpe_users_profile")
      .upsert({ user_id: user.id, first_name: firstName, last_name: lastName });
    toast.success("Profil enregistré.");
  }
  return (
    <>
      <PageHeader title="Profil" />
      <form
        onSubmit={(e) => void save(e)}
        className="mx-auto grid max-w-md gap-3 p-4"
      >
        <Input
          placeholder="Prénom"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <Input
          placeholder="Nom"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
        <Button>Enregistrer</Button>
      </form>
    </>
  );
}

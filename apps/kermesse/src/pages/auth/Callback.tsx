import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@agpe/shared/supabase-client";
import { useAuth } from "@agpe/shared/auth/useAuth";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
export function Callback() {
  const navigate = useNavigate();
  const { refreshRole } = useAuth();
  useEffect(() => {
    async function run(): Promise<void> {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        navigate("/login");
        return;
      }
      await supabase.rpc("kermesse_bootstrap_admin", {
        admin_email: import.meta.env.VITE_ADMIN_EMAIL,
      });
      let role = await refreshRole();
      if (!role) {
        await supabase
          .from("kermesse_user_roles")
          .insert({ user_id: user.id, role: "volunteer" });
        role = await refreshRole();
      }
      navigate(role === "admin" ? "/admin/dashboard" : "/volunteer/stands", {
        replace: true,
      });
    }
    void run();
  }, [navigate, refreshRole]);
  return <LoadingSkeleton />;
}

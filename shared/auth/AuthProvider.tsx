import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabase-client";

export type Role = "admin" | "volunteer";
interface AuthContextValue {
  session: Session | null;
  user: User | null;
  role: Role | null;
  loading: boolean;
  refreshRole: () => Promise<Role | null>;
  signOut: () => Promise<void>;
}
export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshRole(): Promise<Role | null> {
    const { data: current } = await supabase.auth.getSession();
    const uid = current.session?.user.id;
    if (!uid) {
      setRole(null);
      return null;
    }
    const { data } = await supabase
      .from("kermesse_user_roles")
      .select("role")
      .eq("user_id", uid)
      .maybeSingle();
    const nextRole = data?.role ?? null;
    setRole(nextRole);
    return nextRole;
  }

  useEffect(() => {
    let mounted = true;
    async function init(): Promise<void> {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      await refreshRole();
      if (mounted) setLoading(false);
    }
    void init();
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        void refreshRole();
      },
    );
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
  }
  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      role,
      loading,
      refreshRole,
      signOut,
    }),
    [session, role, loading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

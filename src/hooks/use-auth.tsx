import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, type Agency } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  agency: Agency | null;
  loading: boolean;
  refreshAgency: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAgency = async (uid: string | undefined) => {
    if (!uid) {
      setAgency(null);
      return;
    }
    const { data } = await supabase
      .from("agencies")
      .select("*")
      .eq("supabase_user_id", uid)
      .maybeSingle();
    setAgency((data as Agency) ?? null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      // defer to avoid deadlocks
      setTimeout(() => {
        loadAgency(s?.user?.id);
      }, 0);
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      await loadAgency(s?.user?.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    agency,
    loading,
    refreshAgency: () => loadAgency(user?.id),
    signOut: async () => {
      await supabase.auth.signOut();
      setAgency(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

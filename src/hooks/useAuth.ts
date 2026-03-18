import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGerente, setIsGerente] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    let mounted = true;

    const syncAuthState = async (currentSession: Session | null) => {
      if (!mounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (!currentSession?.user) {
        setIsAdmin(false);
        setIsGerente(false);
        setMustChangePassword(false);
        setLoading(false);
        return;
      }

      const [rolesResult, accessResult] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", currentSession.user.id),
        supabase
          .from("user_access_control")
          .select("must_change_password, temp_password_expires_at")
          .eq("user_id", currentSession.user.id)
          .maybeSingle(),
      ]);

      if (!mounted) return;

      setIsAdmin(rolesResult.data?.some((r) => r.role === "admin") ?? false);

      const access = accessResult.data;
      if (access) {
        const expired = access.temp_password_expires_at
          ? new Date(access.temp_password_expires_at) < new Date()
          : false;
        setMustChangePassword(access.must_change_password && !expired);
      } else {
        setMustChangePassword(false);
      }

      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      void syncAuthState(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        void syncAuthState(currentSession);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error };

    if (user) {
      const { data, error: markError } = await supabase.functions.invoke("admin-users", {
        body: { action: "mark_password_changed", userId: user.id },
      });

      if (markError || data?.error) {
        return { error: new Error(data?.error || markError?.message || "Falha ao finalizar troca de senha") };
      }

      setMustChangePassword(false);
    }

    return { error: null };
  };

  return { user, session, loading, isAdmin, mustChangePassword, signIn, signOut, updatePassword };
}

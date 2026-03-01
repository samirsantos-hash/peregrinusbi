import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Check admin role
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id);
          setIsAdmin(roles?.some((r) => r.role === "admin") ?? false);

          // Check must_change_password
          const { data: access } = await supabase
            .from("user_access_control")
            .select("must_change_password, temp_password_expires_at")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (access) {
            const expired = access.temp_password_expires_at
              ? new Date(access.temp_password_expires_at) < new Date()
              : false;
            setMustChangePassword(access.must_change_password && !expired);
          } else {
            setMustChangePassword(false);
          }
        } else {
          setIsAdmin(false);
          setMustChangePassword(false);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
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
    if (!error && user) {
      // Mark password as changed via edge function
      await supabase.functions.invoke("admin-users", {
        body: { action: "mark_password_changed", userId: user.id },
      });
      setMustChangePassword(false);
    }
    return { error };
  };

  return { user, session, loading, isAdmin, mustChangePassword, signIn, signOut, updatePassword };
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

const AUTH_PROFILE_TIMEOUT_MS = 8_000;
// Renova o token quando faltar menos que isso para expirar (iframe do Preview costuma
// ficar suspenso e perder o ciclo automático de refresh do supabase-js).
const REFRESH_MARGIN_SECONDS = 5 * 60;
const REFRESH_CHECK_INTERVAL_MS = 60_000;

async function withTimeout<T>(request: PromiseLike<T>): Promise<T> {
  return Promise.race([
    Promise.resolve(request),
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error("Tempo limite ao carregar o perfil de acesso")), AUTH_PROFILE_TIMEOUT_MS);
    }),
  ]);
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGestorLoja, setIsGestorLoja] = useState(false);
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

      try {
        const [rolesResult, accessResult] = await withTimeout(Promise.all([
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", currentSession.user.id),
          supabase
            .from("user_access_control")
            .select("must_change_password, temp_password_expires_at")
            .eq("user_id", currentSession.user.id)
            .maybeSingle(),
        ]));

        if (!mounted) return;

        setIsAdmin(rolesResult.data?.some((r) => r.role === "admin") ?? false);
        setIsGerente(rolesResult.data?.some((r) => r.role === "gerente") ?? false);
        setIsGestorLoja(rolesResult.data?.some((r) => r.role === "gestor_loja") ?? false);

        const access = accessResult.data;
        if (access) {
          const expired = access.temp_password_expires_at
            ? new Date(access.temp_password_expires_at) < new Date()
            : false;
          setMustChangePassword(access.must_change_password && !expired);
        } else {
          setMustChangePassword(false);
        }
      } catch (error) {
        console.error("Falha ao carregar o perfil de acesso", error);
        if (!mounted) return;
        setIsAdmin(false);
        setIsGerente(false);
        setIsGestorLoja(false);
        setMustChangePassword(false);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        void syncAuthState(session);
      })
      .catch((error) => {
        console.error("Falha ao restaurar a sessão", error);
        if (mounted) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // Refresh de token não muda o usuário: só atualiza a sessão, sem recarregar o perfil.
        if (event === "TOKEN_REFRESHED" && currentSession?.user) {
          if (!mounted) return;
          setSession(currentSession);
          setUser(currentSession.user);
          return;
        }
        void syncAuthState(currentSession);
      }
    );

    let refreshing = false;
    const ensureFreshSession = async () => {
      if (!mounted || refreshing) return;
      refreshing = true;
      try {
        const { data } = await supabase.auth.getSession();
        const current = data.session;
        if (!current) return;
        const expiresAt = current.expires_at ?? 0;
        const secondsLeft = expiresAt - Math.floor(Date.now() / 1000);
        if (secondsLeft > REFRESH_MARGIN_SECONDS) return;

        const { error } = await supabase.auth.refreshSession();
        if (error) {
          // Falha transitória (offline, iframe suspenso): mantém a sessão atual e tenta depois.
          console.warn("Não foi possível renovar a sessão agora", error.message);
        }
      } catch (error) {
        console.warn("Falha ao verificar validade da sessão", error);
      } finally {
        refreshing = false;
      }
    };

    const onWake = () => {
      if (document.visibilityState === "visible") void ensureFreshSession();
    };

    const interval = window.setInterval(() => void ensureFreshSession(), REFRESH_CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
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

  return { user, session, loading, isAdmin, isGerente, isGestorLoja, mustChangePassword, signIn, signOut, updatePassword };
}

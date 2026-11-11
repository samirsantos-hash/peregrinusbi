import { limparCachePainel } from "@/lib/cachePainel";
import { limparAcessoCompartilhado } from "@/hooks/useMyAccess";
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

// Vários componentes usam useAuth ao mesmo tempo: compartilha uma única leitura do perfil
// por usuário (30 s) em vez de repetir as mesmas consultas a cada componente.
const PERFIL_TTL_MS = 30_000;
let perfilCompartilhado: { userId: string; em: number; promessa: Promise<[any, any]> } | null = null;
export function limparPerfilCompartilhado() { perfilCompartilhado = null; }
function carregarPerfil(userId: string) {
  if (perfilCompartilhado && perfilCompartilhado.userId === userId && Date.now() - perfilCompartilhado.em < PERFIL_TTL_MS) return perfilCompartilhado.promessa;
  const promessa = withTimeout(Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("user_access_control").select("must_change_password, temp_password_expires_at").eq("user_id", userId).maybeSingle(),
  ])) as Promise<[any, any]>;
  perfilCompartilhado = { userId, em: Date.now(), promessa };
  promessa.catch(() => { if (perfilCompartilhado?.promessa === promessa) perfilCompartilhado = null; });
  return promessa;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGestorLoja, setIsGestorLoja] = useState(false);
  const [isGerente, setIsGerente] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [tempPasswordExpiresAt, setTempPasswordExpiresAt] = useState<string | null>(null);


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
        setTempPasswordExpiresAt(null);
        setLoading(false);
        return;
      }

      try {
        const [rolesResult, accessResult] = await carregarPerfil(currentSession.user.id);

        if (!mounted) return;

        setIsAdmin(rolesResult.data?.some((r) => r.role === "admin" || r.role === 'super_admin') ?? false);
        setIsGerente(rolesResult.data?.some((r) => r.role === "gerente") ?? false);
        setIsGestorLoja(rolesResult.data?.some((r) => r.role === "gestor_loja") ?? false);

        const access = accessResult.data;
        if (access) {
          // A validade da senha provisória é apenas informativa (mostra um cronômetro
          // na tela de troca). Expirar NÃO bloqueia o acesso nem cancela a troca.
          setMustChangePassword(access.must_change_password);
          setTempPasswordExpiresAt(access.temp_password_expires_at ?? null);
        } else {
          setMustChangePassword(false);
          setTempPasswordExpiresAt(null);
        }
      } catch (error) {
        console.error("Falha ao carregar o perfil de acesso", error);

        if (!mounted) return;
        setIsAdmin(false);
        setIsGerente(false);
        setIsGestorLoja(false);
        setMustChangePassword(false);
        setTempPasswordExpiresAt(null);

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
    // Passa pela proteção de tentativas: 3 erros alertam, 5 em 30 min bloqueiam.
    const { data, error } = await supabase.functions.invoke("auth-guard", {
      body: { acao: "login", email, senha: password },
    });
    if (error || !data?.access_token) {
      let corpo: { error?: string; minutos?: number; restantes?: number } = data ?? {};
      const ctx = (error as { context?: Response } | null)?.context;
      if (ctx && typeof ctx.json === "function") {
        try { corpo = await ctx.json(); } catch { /* resposta sem corpo */ }
      }
      if (corpo.error === "bloqueado") {
        return { error: new Error(`Acesso bloqueado por muitas tentativas. Tente novamente em ${corpo.minutos ?? 30} minutos.`) };
      }
      if (corpo.error === "credenciais") {
        const aviso = corpo.restantes && corpo.restantes <= 2 ? ` Restam ${corpo.restantes} tentativas antes do bloqueio.` : "";
        return { error: new Error(`E-mail ou senha incorretos.${aviso}`) };
      }
      return { error: new Error("Não foi possível entrar agora. Tente novamente.") };
    }
    const { error: sessaoErro } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    return { error: sessaoErro };
  };

  const signOut = async () => {
    await limparCachePainel();
    limparPerfilCompartilhado();
    limparAcessoCompartilhado();
    await supabase.auth.signOut();
  };

  const updatePassword = async (newPassword: string, currentPassword?: string) => {
    const payload: Record<string, string> = { password: newPassword };
    if (currentPassword) payload.current_password = currentPassword;

    let { error } = await supabase.auth.updateUser(payload as { password: string });

    // Alguns projetos exigem a senha atual; se ela não foi enviada, avisamos de forma clara.
    if (error) return { error };

    // Encerra a conta nos outros aparelhos; este continua conectado.
    await supabase.auth.signOut({ scope: "others" });

    if (user) {
      const { data, error: markError } = await supabase.functions.invoke("admin-users", {
        body: { action: "mark_password_changed", userId: user.id },
      });

      if (markError || data?.error) {
        return { error: new Error(data?.error || markError?.message || "Falha ao finalizar troca de senha") };
      }

      limparPerfilCompartilhado();
      setMustChangePassword(false);
    }

    return { error: null };
  };


  return { user, session, loading, isAdmin, isGerente, isGestorLoja, mustChangePassword, tempPasswordExpiresAt, signIn, signOut, updatePassword };
}

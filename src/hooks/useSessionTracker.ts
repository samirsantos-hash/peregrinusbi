import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

function generateUUID(): string {
  return crypto.randomUUID?.() ?? 
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

export function useSessionTracker(user: User | null) {
  const sessionIdRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    const token = generateUUID();

    // Insert session
    supabase
      .from("user_sessions")
      .insert({
        user_id: user.id,
        session_token: token,
        login_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        user_agent: navigator.userAgent?.slice(0, 512) ?? null,
      })
      .select("id")
      .single()
      .then(({ data }) => {
        if (data) sessionIdRef.current = data.id;
      });

    // Heartbeat
    const heartbeat = () => {
      if (!sessionIdRef.current) return;
      supabase
        .from("user_sessions")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", sessionIdRef.current)
        .then(() => {});
    };

    intervalRef.current = setInterval(heartbeat, 60_000);

    // Visibility change
    const onVisibility = () => {
      if (document.visibilityState === "visible") heartbeat();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Unload / close
    const endSession = () => {
      if (!sessionIdRef.current) return;
      const body = JSON.stringify({
        logout_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      });
      // Use sendBeacon for reliability on tab close
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_sessions?id=eq.${sessionIdRef.current}`;
      const headers = {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${supabase.auth.session?.()?.access_token ?? ""}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      };
      // sendBeacon doesn't support custom headers, fall back to fetch keepalive
      try {
        fetch(url, {
          method: "PATCH",
          headers,
          body,
          keepalive: true,
        });
      } catch {
        // best effort
      }
    };

    window.addEventListener("beforeunload", endSession);
    window.addEventListener("pagehide", endSession);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", endSession);
      window.removeEventListener("pagehide", endSession);
      // End session on unmount (logout)
      if (sessionIdRef.current) {
        supabase
          .from("user_sessions")
          .update({ logout_at: new Date().toISOString(), last_seen_at: new Date().toISOString() })
          .eq("id", sessionIdRef.current)
          .then(() => {});
        sessionIdRef.current = null;
      }
    };
  }, [user?.id]);
}
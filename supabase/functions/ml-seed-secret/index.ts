// ml-seed-secret (uso único)
// Lê REFRESH_TRIGGER_SECRET do ambiente e grava no Vault via RPC.
// Não retorna nem loga o valor. Deve ser removida após a execução.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const value = Deno.env.get("REFRESH_TRIGGER_SECRET");
  if (!value) {
    return new Response(JSON.stringify({ ok: false, error: "secret_missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error } = await admin.rpc("ml_set_trigger_secret", { p_value: value });

  return new Response(
    JSON.stringify({ ok: !error, error: error?.message ?? null }),
    { status: error ? 500 : 200, headers: { "Content-Type": "application/json" } },
  );
});

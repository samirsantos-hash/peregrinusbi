// Rotinas programadas enviam x-refresh-secret lido do cofre do banco.
// Aceita o valor do ambiente da função ou o do cofre (via RPC só do servidor),
// para que os dois lugares não precisem estar sincronizados à mão.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function igual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < b.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function triggerSecretOk(provided: string): Promise<boolean> {
  if (!provided) return false;
  if (igual(provided, Deno.env.get("REFRESH_TRIGGER_SECRET") ?? "")) return true;
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await db.rpc("ml_trigger_secret_ok", { p_value: provided });
  return data === true;
}

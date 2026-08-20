import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PerfilML = "super" | "admin" | "consultor" | "rede" | "gestor" | "nenhum";

export const PERFIS = {
  // Somente o Super admin envia planilhas, publica cargas e cadastra lojas da rede.
  super: { nome: "Super admin", escopo: "rede", podeCarregar: true, podeConfigurar: true },
  admin: { nome: "Administrador", escopo: "rede", podeCarregar: false, podeConfigurar: false },
  consultor: { nome: "Consultor", escopo: "rede", podeCarregar: false, podeConfigurar: false },
  // Consultor com acesso ao cliente piloto (MEGAJU): vê a rede, mas não carrega nem configura.
  rede: { nome: "Consultor (somente leitura)", escopo: "rede", podeCarregar: false, podeConfigurar: false },
  gestor: { nome: "Gestor Loja Oficial", escopo: "loja", podeCarregar: false, podeConfigurar: false },
  nenhum: { nome: "Sem acesso", escopo: "nenhum", podeCarregar: false, podeConfigurar: false },
} as const;

export interface LojaOficial {
  id: string;
  chave_tecnica: string;
  nome_publico: string;
  marca: string | null;
  segmento: string | null;
  conta_id: string | null;
  vinculo: string | null;
  vinculo_score: number | null;
  gestor_user_id: string | null;
  ativo: boolean;
}

/** Resolve o perfil do usuário na aba Multilojas e as lojas oficiais sob sua responsabilidade. */
export function usePerfilMultilojas() {
  const { user, loading: authLoading } = useAuth();
  const [perfil, setPerfil] = useState<PerfilML>("nenhum");
  const [lojas, setLojas] = useState<LojaOficial[]>([]);
  const [minhasLojas, setMinhasLojas] = useState<LojaOficial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivo = true;
    if (authLoading) return;
    if (!user) { setPerfil("nenhum"); setLojas([]); setMinhasLojas([]); setLoading(false); return; }

    (async () => {
      setLoading(true);
      const [{ data: roles }, { data: ls }, { data: podeVerRede }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("multilojas_loja").select("*").order("nome_publico"),
        (supabase as any).rpc("ml_pode_ver_rede"),
      ]);
      if (!vivo) return;

      const r = (roles || []).map((x) => x.role as string);
      const p: PerfilML = r.includes("super_admin") ? "super"
        : r.includes("admin") ? "admin"
        : r.includes("gerente") ? "consultor"
        : r.includes("gestor_loja") ? "gestor"
        : podeVerRede === true ? "rede"
        : "nenhum";

      const todas = (ls || []) as LojaOficial[];
      setPerfil(p);
      setLojas(todas);
      setMinhasLojas(todas.filter((l) => l.gestor_user_id === user.id));
      setLoading(false);
    })();

    return () => { vivo = false; };
  }, [user, authLoading]);

  const cfg = PERFIS[perfil];
  return {
    perfil,
    rotuloPerfil: cfg.nome,
    escopoRede: cfg.escopo === "rede",
    podeCarregar: cfg.podeCarregar,
    podeConfigurar: cfg.podeConfigurar,
    temAcesso: perfil !== "nenhum",
    lojas,
    minhasLojas,
    loading: loading || authLoading,
  };
}

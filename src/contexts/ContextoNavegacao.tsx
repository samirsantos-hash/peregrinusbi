import { createContext, useCallback, useContext, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { sinalizarSelecaoCarregamento } from '@/components/chuva/selecaoCarregamento';

export interface ContextoNavegacao {
  periodo: { inicio: string; fim: string };
  programaId: string | null;
  filtros: Record<string, string | boolean>;
  aba: string | null;
}

interface Api extends ContextoNavegacao {
  setPeriodo: (p: { inicio: string; fim: string }) => void;
  setPrograma: (id: string | null) => void;
  setFiltro: (chave: string, valor: string | boolean | null) => void;
  setAba: (aba: string | null) => void;
  queryString: string;
  navegarPreservando: (destino: string) => void;
}

const Ctx = createContext<Api | null>(null);

const CHAVES_RESERVADAS = new Set(["periodo", "programa", "aba"]);

function parsePeriodo(raw: string | null) {
  const hoje = new Date();
  const fimPadrao = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const inicioPadrao = `${hoje.getFullYear()}-01`;
  if (!raw || !raw.includes(":")) return { inicio: inicioPadrao, fim: fimPadrao };
  const [inicio, fim] = raw.split(":");
  return { inicio: inicio || inicioPadrao, fim: fim || fimPadrao };
}

export function ContextoNavegacaoProvider({ children }: { children: React.ReactNode }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const periodo = useMemo(() => parsePeriodo(params.get("periodo")), [params]);
  const programaId = params.get("programa");
  const aba = params.get("aba");

  const filtros = useMemo(() => {
    const out: Record<string, string | boolean> = {};
    params.forEach((valor, chave) => {
      if (CHAVES_RESERVADAS.has(chave)) return;
      out[chave] = valor === "true" ? true : valor === "false" ? false : valor;
    });
    return out;
  }, [params]);

  const atualizar = useCallback(
    (chave: string, valor: string | null) => {
      const proximo = new URLSearchParams(params);
      if (valor === null || valor === "") proximo.delete(chave);
      else proximo.set(chave, valor);
      setParams(proximo, { replace: false });
    },
    [params, setParams],
  );

  const queryString = params.toString();

  const navegarPreservando = useCallback(
    (destino: string) => {
      const [caminho, propriaQuery] = destino.split("?");
      const merged = new URLSearchParams(params);
      if (propriaQuery) {
        new URLSearchParams(propriaQuery).forEach((v, k) => merged.set(k, v));
      }
      const qs = merged.toString();
      navigate(qs ? `${caminho}?${qs}` : caminho);
      const destinationSeller = /^\/lojas\/([^/]+)(?:\/|$)/.exec(caminho)?.[1];
      const currentSeller = /^\/lojas\/([^/]+)(?:\/|$)/.exec(pathname)?.[1];
      // Selecting another seller counts; moving between analyses of the same seller does not.
      if (destinationSeller && destinationSeller !== currentSeller) {
        window.__lovableEvents?.track?.("project.seller_selection_changed", {
          source_view: /^\/(carteira|grupos)(\/|$)/.test(pathname)
            ? "portfolio"
            : currentSeller ? "seller_analysis" : "dashboard",
          seller_scope: "single_store",
        });
      }
      // Only explicit entry into a store/listing analysis; never emit IDs or URLs.
      const analysisLevel = /^\/lojas\/[^/]+\/?$/.test(caminho)
        ? "store"
        : /^\/lojas\/[^/]+\/anuncios\/[^/]+\/?$/.test(caminho)
          ? "listing"
          : null;
      if (analysisLevel && caminho.replace(/\/$/, "") !== pathname.replace(/\/$/, "")) {
        window.__lovableEvents?.track?.("project.seller_analysis_opened", {
          analysis_level: analysisLevel,
          source: /^\/(carteira|grupos)(\/|$)/.test(pathname)
            ? "portfolio"
            : pathname.startsWith("/lojas/") ? "seller_analysis" : "dashboard",
          seller_scope: "single_store",
        });
      }
    },
    [navigate, params, pathname],
  );

  const api: Api = {
    periodo,
    programaId,
    filtros,
    aba,
    queryString,
    setPeriodo: (p) => { if (p.inicio !== periodo.inicio || p.fim !== periodo.fim) sinalizarSelecaoCarregamento(); atualizar("periodo", `${p.inicio}:${p.fim}`); },
    setPrograma: (id) => atualizar("programa", id),
    setFiltro: (chave, valor) =>
      atualizar(chave, valor === null ? null : typeof valor === "boolean" ? String(valor) : valor),
    setAba: (a) => atualizar("aba", a),
    navegarPreservando,
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useContextoNavegacao() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useContextoNavegacao precisa de ContextoNavegacaoProvider");
  return ctx;
}

/** Único helper de navegação entre níveis. Nunca use navigate() cru. */
export function useNavegarPreservando() {
  return useContextoNavegacao().navegarPreservando;
}

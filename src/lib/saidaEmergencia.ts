// Saída de emergência: quando o servidor dá sinais de sobrecarga, o painel para de
// consultar e mostra a última cópia boa das telas, aliviando a carga antes da queda.
export const JANELA_MS = 30_000;
export const SINAIS_PARA_ABRIR = 3;
export const LENTO_MS = 3_000;
export const PAUSA_MS = 60_000;

const RPC_LEITURA = /^\/rest\/v1\/rpc\/(indicadores_|get_|ml_minhas_contas_status|ml_contas_|ml_ads_painel_grupos|ml_tendencias_)/;

export type Estado = { sinais: number[]; abertoAte: number };
export const novoEstado = (): Estado => ({ sinais: [], abertoAte: 0 });

export const sinalDeSobrecarga = (status: number | null, ms: number) =>
  status === null || status === 429 || status >= 500 || ms > LENTO_MS;

/** Registra uma resposta; devolve true se a saída de emergência acabou de abrir. */
export function registrar(e: Estado, agora: number, status: number | null, ms: number): boolean {
  if (!sinalDeSobrecarga(status, ms)) {
    if (e.abertoAte && agora >= e.abertoAte) { e.abertoAte = 0; e.sinais = []; }
    return false;
  }
  e.sinais = e.sinais.filter((t) => agora - t < JANELA_MS).concat(agora);
  if (e.sinais.length >= SINAIS_PARA_ABRIR && agora >= e.abertoAte) { e.abertoAte = agora + PAUSA_MS; e.sinais = []; return true; }
  return false;
}
export const emergenciaAtiva = (e: Estado, agora: number) => agora < e.abertoAte;

/** Só leituras podem ser servidas da cópia guardada; escritas sempre vão ao servidor. */
export function chaveLeitura(metodo: string, url: URL, corpo: string): string | null {
  if (!url.pathname.startsWith('/rest/v1/')) return null;
  if (metodo === 'GET') return 'GET ' + url.pathname + url.search;
  if (metodo === 'POST' && RPC_LEITURA.test(url.pathname)) return 'POST ' + url.pathname + url.search + ' ' + corpo;
  return null;
}

const LIMITE_COPIAS = 300;
const estado = novoEstado();
const copias = new Map<string, { corpo: string; status: number; headers: [string, string][] }>();
export const EVENTO = 'peregrinus-emergencia';

export function instalarSaidaEmergencia(origemApi: string) {
  if (typeof window === 'undefined' || (window as any).__saidaEmergencia) return;
  (window as any).__saidaEmergencia = true;
  const original = window.fetch.bind(window);
  const avisar = () => window.dispatchEvent(new CustomEvent(EVENTO, { detail: { ativa: emergenciaAtiva(estado, Date.now()), ate: estado.abertoAte } }));

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const pedido = input instanceof Request ? input : null;
    const url = new URL(pedido ? pedido.url : String(input), window.location.href);
    if (url.origin !== origemApi) return original(input, init);
    const metodo = (init?.method || pedido?.method || 'GET').toUpperCase();
    const corpo = typeof init?.body === 'string' ? init.body : '';
    const chave = chaveLeitura(metodo, url, corpo);

    if (chave && emergenciaAtiva(estado, Date.now())) {
      const c = copias.get(chave);
      if (c) return new Response(c.corpo, { status: c.status, headers: c.headers });
    }
    const t0 = performance.now();
    try {
      const r = await original(input, init);
      const abriu = registrar(estado, Date.now(), r.status, performance.now() - t0);
      if (abriu) avisar();
      if (chave && r.ok) {
        const texto = await r.clone().text();
        if (texto.length < 500_000) {
          copias.delete(chave); copias.set(chave, { corpo: texto, status: r.status, headers: [...r.headers.entries()] });
          if (copias.size > LIMITE_COPIAS) copias.delete(copias.keys().next().value as string);
        }
      }
      return r;
    } catch (erro) {
      if (registrar(estado, Date.now(), null, performance.now() - t0)) avisar();
      const c = chave ? copias.get(chave) : undefined;
      if (c) return new Response(c.corpo, { status: c.status, headers: c.headers });
      throw erro;
    }
  };
  window.setInterval(() => { if (estado.abertoAte && Date.now() >= estado.abertoAte) { estado.abertoAte = 0; avisar(); } }, 5_000);
}

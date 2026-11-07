import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { progressoConsultas } from "./progressoConsultas";
import { definirCarregamentoApresentacao } from "./estadoApresentacao";
import "./entrada-pagina.css";

export function IndicadorCarregamento() {
  const client = useQueryClient();
  const [estado, setEstado] = useState({ total: 0, concluidas: 0, percentual: 0, segundos: 0 });
  useEffect(() => {
    const consultas = new Map<string, boolean>();
    let inicio = 0;
    let fechar: ReturnType<typeof setTimeout> | undefined;
    const atualizar = () => {
      const cache = client.getQueryCache().getAll();
      for (const q of cache) {
        if (q.state.fetchStatus === 'fetching') {
          if (consultas.size === 0) inicio = Date.now();
          consultas.set(q.queryHash, false);
        } else if (consultas.has(q.queryHash)) {
          consultas.set(q.queryHash, q.state.fetchStatus === 'idle');
        }
      }
      const progresso = progressoConsultas(consultas);
      setEstado({ ...progresso, segundos: inicio ? Math.floor((Date.now() - inicio) / 1000) : 0 });
      if (fechar) { clearTimeout(fechar); fechar = undefined; }
      if (progresso.total > 0 && progresso.concluidas === progresso.total) {
        fechar = setTimeout(() => {
          consultas.clear(); inicio = 0;
          setEstado({ total: 0, concluidas: 0, percentual: 0, segundos: 0 });
        }, 600);
      }
    };
    atualizar();
    const unsubscribe = client.getQueryCache().subscribe(atualizar);
    const relogio = setInterval(() => {
      if (inicio) setEstado(e => ({ ...e, segundos: Math.floor((Date.now() - inicio) / 1000) }));
    }, 1000);
    return () => { unsubscribe(); clearInterval(relogio); if (fechar) clearTimeout(fechar); };
  }, [client]);
  const bloqueado = estado.total > 0;
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root || !bloqueado) return;
    const inertAnterior = root.inert;
    definirCarregamentoApresentacao(true);
    root.classList.remove('pagina-resultados-prontos');
    root.inert = true;
    root.classList.add('pagina-aguardando-consultas');
    return () => {
      root.inert = inertAnterior;
      root.classList.remove('pagina-aguardando-consultas');
      root.classList.add('pagina-resultados-prontos');
      definirCarregamentoApresentacao(false);
    };
  }, [bloqueado]);
  if (estado.total === 0) return null;
  const terminou = estado.concluidas === estado.total;
  return createPortal(<div className="tela-carregamento" aria-busy={!terminou}><div role="status" aria-label="Progresso do carregamento" className="indicador-carregamento w-72 max-w-[calc(100vw-32px)] px-5 py-4 text-foreground">
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 text-sm font-medium leading-none">{!terminou && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-primary" />}{terminou ? 'Consultas finalizadas' : 'Carregando'}</span>
      <span className="text-xl font-semibold leading-none tabular-nums text-primary">{estado.percentual}%</span>
    </div>
    <div className="barra-trilho mt-3" aria-hidden="true"><div className="barra-progresso" style={{ transform: `scaleX(${Math.max(0.02, estado.percentual / 100)})` }} /></div>
    <p className="mt-2.5 text-xs text-muted-foreground tabular-nums">{estado.concluidas} de {estado.total} consultas finalizadas · {estado.segundos}s</p>
  </div></div>, document.body);
}
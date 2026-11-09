import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { progressoConsultas } from "./progressoConsultas";
import { definirCarregamentoApresentacao } from "./estadoApresentacao";
import { SkeletonPainel } from './SkeletonPainel';
import "./entrada-pagina.css";

export function IndicadorCarregamento() {
  const client = useQueryClient();
  const [estado, setEstado] = useState({ total: 0, concluidas: 0, percentual: 0, segundos: 0, milissegundos: 0 });
  const [atualizando, setAtualizando] = useState(0);
  const [selecao, setSelecao] = useState(false);
  const [bloqueioSelecao, setBloqueioSelecao] = useState(false);
  useEffect(() => {
    const consultas = new Map<string, boolean>();
    let inicio = 0;
    let fechar: ReturnType<typeof setTimeout> | undefined;
    let porSelecao = false;
    const atualizar = () => {
      const cache = client.getQueryCache().getAll();
      if (porSelecao && cache.some(q => q.getObserversCount() > 0 && q.state.fetchStatus === 'fetching' && q.state.data === undefined)) setBloqueioSelecao(true);
      setAtualizando(cache.filter(q => q.getObserversCount() > 0 && q.state.fetchStatus === 'fetching' && q.state.data !== undefined).length);
      for (const q of cache) {
        if (q.getObserversCount() > 0 && q.state.fetchStatus === 'fetching' && (q.state.data === undefined || porSelecao)) {
          if (consultas.size === 0 && !inicio) inicio = Date.now();
          consultas.set(q.queryHash, false);
        } else if (consultas.has(q.queryHash)) {
          consultas.set(q.queryHash, q.state.fetchStatus === 'idle');
        }
      }
      const progresso = progressoConsultas(consultas);
      const milissegundos = inicio ? Date.now() - inicio : 0;
      setEstado({ ...progresso, segundos: Math.floor(milissegundos / 1000), milissegundos });
      if (fechar) { clearTimeout(fechar); fechar = undefined; }
      if ((progresso.total > 0 && progresso.concluidas === progresso.total) || (porSelecao && progresso.total === 0)) {
        fechar = setTimeout(() => {
          consultas.clear(); inicio = 0;
          porSelecao = false; setSelecao(false); setBloqueioSelecao(false);
          setEstado({ total: 0, concluidas: 0, percentual: 0, segundos: 0, milissegundos: 0 });
        }, 600);
      }
    };
    const selecionar = () => {
      consultas.clear(); inicio = Date.now(); porSelecao = true; setSelecao(true); setBloqueioSelecao(false);
      atualizar();
    };
    window.addEventListener('painel-selecao-carregamento', selecionar);
    atualizar();
    const unsubscribe = client.getQueryCache().subscribe(atualizar);
    const relogio = setInterval(() => {
      if (inicio) setEstado(e => ({ ...e, segundos: Math.floor((Date.now() - inicio) / 1000), milissegundos: Date.now() - inicio }));
    }, 100);
    return () => { unsubscribe(); window.removeEventListener('painel-selecao-carregamento', selecionar); clearInterval(relogio); if (fechar) clearTimeout(fechar); };
  }, [client]);
  const bloqueado = estado.total > 0 && (!selecao || bloqueioSelecao);
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
  if (estado.total === 0) return atualizando > 0 ? createPortal(<div role="status" aria-label="Atualização dos dados" className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-border bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm"><Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin text-primary" />Atualizando dados…</div>, document.body) : null;
  const terminou = estado.concluidas === estado.total;
  const mostrarSkeleton = bloqueado && estado.milissegundos > 2000;
  if (!selecao) return createPortal(<div className="tela-carregamento" aria-busy={!terminou}>{mostrarSkeleton ? <SkeletonPainel /> : <div role="status" aria-label="Carregamento em andamento" className="flex h-full items-center justify-center"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-primary" /></div>}</div>, document.body);
  return createPortal(<div className={bloqueado ? 'tela-carregamento' : 'carregamento-atualizacao'} aria-busy={!terminou}>{mostrarSkeleton && <SkeletonPainel />}<div role="status" aria-label="Progresso do carregamento" className="indicador-carregamento w-80 max-w-[calc(100vw-32px)] px-5 py-4 text-foreground">
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 text-sm font-medium leading-none">{!terminou && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-primary" />}{terminou ? 'Consultas finalizadas' : 'Carregando'}</span>
      <span className="text-xl font-semibold leading-none tabular-nums text-primary">{estado.percentual}%</span>
    </div>
    <div className="barra-trilho mt-3" role="progressbar" aria-label="Leituras concluídas" aria-valuemin={0} aria-valuemax={100} aria-valuenow={estado.percentual}><div className="barra-progresso" style={{ transform: `scaleX(${estado.percentual / 100})` }} /></div>
    <p className="mt-2.5 text-xs text-muted-foreground tabular-nums">{estado.concluidas} de {estado.total} leituras concluídas · {estado.segundos}s decorridos</p>
  </div></div>, document.body);
}
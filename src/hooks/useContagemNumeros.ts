import { useEffect } from "react";

/**
 * Faz os números visíveis da seção contarem de 0 até o valor final sempre que a aba muda.
 * Só altera o texto de forma temporária e termina no valor original; se o React atualizar o
 * texto no meio da animação, ela para e mantém o valor novo (não mexe na estrutura da página).
 */
const RE = /\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g;
const ALVO = /tabular-nums|tnum|font-mono|text-(?:xl|2xl|3xl|4xl)/;

function fmt(n: number, casas: number, milhar: boolean) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas, useGrouping: milhar });
}

export function useContagemNumeros(chave: string, raiz: () => HTMLElement | null, duracao = 1100) {
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let pendentes: { n: Text; original: string; ultimo: string }[] = [];
    const t = window.setTimeout(() => {
      const el = raiz();
      if (!el) return;
      const nos: { n: Text; original: string; ultimo: string; partes: { ini: number; fim: number; alvo: number; casas: number; milhar: boolean }[] }[] = [];
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode() as Text | null; n; n = w.nextNode() as Text | null) {
        const p = n.parentElement;
        const txt = n.nodeValue ?? "";
        if (!p || !/\d/.test(txt) || txt.length > 40) continue;
        if (p.closest("svg,input,textarea,select,[data-contando],[data-sem-contagem]")) continue;
        if (!p.closest("[class]") || !ALVO.test(p.className + " " + (p.parentElement?.className ?? ""))) continue;
        if (/\d{1,2}\/\d{1,2}|\d{1,2}:\d{2}|\d{4}-\d{2}/.test(txt)) continue; // datas e horas não contam
        const partes = [...txt.matchAll(RE)].map((m) => {
          const b = m[0];
          return { ini: m.index!, fim: m.index! + b.length, alvo: parseFloat(b.replace(/\./g, "").replace(",", ".")), casas: b.includes(",") ? b.split(",")[1].length : 0, milhar: b.includes(".") };
        });
        if (partes.length) nos.push({ n, original: txt, ultimo: txt, partes });
      }
      pendentes = nos;
      const inicio = performance.now();
      const passo = (agora: number) => {
        const pr = Math.min(1, (agora - inicio) / duracao);
        const e = 1 - Math.pow(1 - pr, 3);
        let vivos = 0;
        for (const x of nos) {
          if (x.n.nodeValue !== x.ultimo) continue; // React mudou o texto: deixa como está
          let s = "", pos = 0;
          for (const q of x.partes) { s += x.original.slice(pos, q.ini) + fmt(q.alvo * e, q.casas, q.milhar); pos = q.fim; }
          s = pr >= 1 ? x.original : s + x.original.slice(pos);
          x.n.nodeValue = s; x.ultimo = s; vivos++;
        }
        if (pr < 1 && vivos) raf = requestAnimationFrame(passo);
      };
      raf = requestAnimationFrame(passo);
    }, 350);
    return () => {
      clearTimeout(t); cancelAnimationFrame(raf);
      for (const x of pendentes) if (x.n.nodeValue === x.ultimo) x.n.nodeValue = x.original;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);
}

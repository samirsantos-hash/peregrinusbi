import { useEffect, useRef, useState } from "react";

/**
 * Anima o primeiro número de um texto já formatado em pt-BR (ex.: "R$ 12,4 mi",
 * "13,83%", "R$ 451.350"), contando de 0 até o valor final. Prefixo e sufixo
 * são preservados; textos sem número aparecem sem animação.
 */
const RE = /-?\d{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+(?:,\d+)?/;

function formatar(n: number, casas: number, milhar: boolean) {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
    useGrouping: milhar,
  });
}

export function NumeroAnimado({ valor, duracao = 1200 }: { valor: string; duracao?: number }) {
  const match = valor.match(RE);
  const [texto, setTexto] = useState(valor);
  const raf = useRef<number>();

  useEffect(() => {
    if (!match) { setTexto(valor); return; }
    const reduz = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduz) { setTexto(valor); return; }
    const bruto = match[0];
    const casas = bruto.includes(",") ? bruto.split(",")[1].length : 0;
    const milhar = bruto.includes(".");
    const alvo = parseFloat(bruto.replace(/\./g, "").replace(",", "."));
    const antes = valor.slice(0, match.index);
    const depois = valor.slice((match.index ?? 0) + bruto.length);
    const inicio = performance.now();
    const passo = (t: number) => {
      const p = Math.min(1, (t - inicio) / duracao);
      const e = 1 - Math.pow(1 - p, 3);
      setTexto(p >= 1 ? valor : antes + formatar(alvo * e, casas, milhar) + depois);
      if (p < 1) raf.current = requestAnimationFrame(passo);
    };
    raf.current = requestAnimationFrame(passo);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, duracao]);

  return <span className="tabular-nums">{texto}</span>;
}

export default NumeroAnimado;

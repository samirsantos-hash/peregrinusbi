import { useEffect, useRef, useState } from "react";
import { useEstadoApresentacao } from '@/components/chuva/estadoApresentacao';

export function extrairNumero(texto: string) {
  const match = texto.match(/-?\d+(?:\.\d{3})*(?:,\d+)?/);
  if (!match) return null;
  const bruto = match[0];
  return {
    valor: Number(bruto.replace(/\./g, "").replace(",", ".")),
    casas: (bruto.split(",")[1] ?? "").length,
    milhar: bruto.includes("."),
    prefixo: texto.slice(0, match.index),
    sufixo: texto.slice((match.index ?? 0) + bruto.length),
  };
}

export function duracaoNumero(de: number, para: number) {
  const proporcao = Math.abs(para - de) / Math.max(Math.abs(de), Math.abs(para), 1);
  return 450 + 450 * Math.sqrt(proporcao);
}

/** React owns every displayed value; never mutate text nodes behind it. */
export function useNumeroAnimado(valor: string, duracao?: number, atraso = 0) {
  const [texto, setTexto] = useState(valor);
  const atual = useRef(0);
  const { carregando, ciclo } = useEstadoApresentacao();
  useEffect(() => {
    const numero = extrairNumero(valor);
    if (carregando) {
      atual.current = 0;
      return;
    }
    if (!numero || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      atual.current = numero?.valor ?? 0;
      setTexto(valor);
      return;
    }
    const de = atual.current;
    const tempo = Math.max(1, duracao ?? duracaoNumero(de, numero.valor));
    let inicio = 0;
    let raf = 0;
    const passo = (agora: number) => {
      const p = Math.min(1, (agora - inicio) / tempo);
      atual.current = de + (numero.valor - de) * (1 - Math.pow(1 - p, 3));
      setTexto(p === 1 ? valor : numero.prefixo + atual.current.toLocaleString("pt-BR", {
        minimumFractionDigits: numero.casas, maximumFractionDigits: numero.casas,
        useGrouping: numero.milhar,
      }) + numero.sufixo);
      if (p < 1) raf = requestAnimationFrame(passo);
    };
    const pausa = de === 0 ? Math.max(0, atraso) : 0;
    const espera = pausa ? window.setTimeout(() => { inicio = performance.now(); raf = requestAnimationFrame(passo); }, pausa) : 0;
    if (!pausa) { inicio = performance.now(); raf = requestAnimationFrame(passo); }
    return () => { window.clearTimeout(espera); cancelAnimationFrame(raf); };
  }, [valor, duracao, carregando, ciclo, atraso]);
  return texto;
}
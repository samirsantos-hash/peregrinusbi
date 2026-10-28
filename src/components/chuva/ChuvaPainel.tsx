import { useEffect, useRef } from "react";
import "./cadence-rain.css";
import "./rainShaders.js";
import "./rain.js";

type RainApi = { destroy(): void; refresh(): void };
declare global {
  interface Window { AsimovRain?: { mount(el: HTMLElement): RainApi } }
}

/** Chuva de luz da referência (shader original), só no painel; a tela de acesso mantém as cordas. */
export function ChuvaPainel() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.AsimovRain) return;
    const api = window.AsimovRain.mount(el);
    return () => api.destroy();
  }, []);
  return <div ref={ref} className="chuva-painel" aria-hidden="true" />;
}

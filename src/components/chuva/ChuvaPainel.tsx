import { useEffect, useRef, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";
import "./cadence-rain.css";
import "./rainShaders.js";
import "./rain.js";

type RainApi = { destroy(): void; refresh(): void };
declare global {
  interface Window { AsimovRain?: { mount(el: HTMLElement): RainApi } }
}

/** Chuva de luz só enquanto o painel carrega dados; com tudo carregado o fundo fica sem chuva. */
export function ChuvaPainel() {
  const carregando = useIsFetching() > 0;
  const [visivel, setVisivel] = useState(carregando);
  useEffect(() => {
    if (carregando) { setVisivel(true); return; }
    const t = setTimeout(() => setVisivel(false), 600);
    return () => clearTimeout(t);
  }, [carregando]);
  if (!visivel) return null;
  return <ChuvaAtiva saindo={!carregando} />;
}

function ChuvaAtiva({ saindo }: { saindo: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.AsimovRain) return;
    const api = window.AsimovRain.mount(el);
    return () => api.destroy();
  }, []);
  return <div ref={ref} className="chuva-painel transition-opacity duration-500" style={{ opacity: saindo ? 0 : undefined }} aria-hidden="true" />;
}

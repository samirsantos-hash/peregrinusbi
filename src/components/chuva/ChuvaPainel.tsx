import { useEffect, useRef, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";
import { AmbientePainel } from "./AmbientePainel";
import { LetrasCarregamento } from "./LetrasCarregamento";
import "./cadence-rain.css";
import "./rainShaders.js";
import "./rain.js";

type RainApi = { destroy(): void; refresh(): void };
declare global {
  interface Window { AsimovRain?: { mount(el: HTMLElement): RainApi } }
}

/** Ambiente permanente; apenas a chuva adicional do HTML depende das consultas. */
export function ChuvaPainel() {
  const carregando = useIsFetching() > 0;
  const [visivel, setVisivel] = useState(carregando);
  useEffect(() => {
    if (carregando) { setVisivel(true); return; }
    const t = setTimeout(() => setVisivel(false), 600);
    return () => clearTimeout(t);
  }, [carregando]);
  return <><AmbientePainel />{visivel && <><ChuvaAtiva saindo={!carregando} /><LetrasCarregamento saindo={!carregando} /></>}</>;
}

function ChuvaAtiva({ saindo }: { saindo: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.AsimovRain) return;
    const api = window.AsimovRain.mount(el);
    return () => api.destroy();
  }, []);
  return <div ref={ref} className={`chuva-painel transition-opacity duration-500 ${saindo ? "opacity-0" : "opacity-100"}`} aria-hidden="true" />;
}

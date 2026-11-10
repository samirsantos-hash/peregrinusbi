import { useEffect, useRef } from "react";

/** Ambiente contínuo independente das consultas; animação local, sem rede. */
const LINHAS_FLUIDAS = Array.from({ length: 10 }, (_, i) => { const t = 200 - i * 50, c = 700 - i * 100; return `M 1200,${t} C ${c},${t + 100} ${c},${1000 - t - 100} 1200,${1000 - t}`; });

export function AmbientePainel() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let last = 0;
    let elapsed = 0;
    let width = 0;
    let height = 0;
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue("--panel-rain-color").trim();
      ctx.lineWidth = 1;
      for (let i = 0; i < 42; i++) {
        const x = ((i * 137.3 + elapsed * (35 + i % 5 * 7)) % (width + 180)) - 90;
        const y = ((i * 89.7 + elapsed * (45 + i % 5 * 9)) % (height + 180)) - 90;
        const length = 16 + i % 7 * 5;
        ctx.globalAlpha = .18 + i % 4 * .09;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + length * .65, y + length);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    const tick = (time: number) => {
      if (time - last >= 50) {
        elapsed += last ? Math.min((time - last) / 1000, .1) : 0;
        last = time;
        draw();
      }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      last = 0;
      draw();
      if (!motion.matches && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const onResize = () => { resize(); draw(); };
    resize();
    sync();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
      ctx.clearRect(0, 0, width, height);
    };
  }, []);
  return <div className="painel-ambiente" aria-hidden="true"><div className="painel-ambiente-fumaca" /><svg className="painel-ambiente-linhas" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="painel-linha-degrade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0" /><stop offset="25%" stopColor="currentColor" stopOpacity=".8" /><stop offset="75%" stopColor="currentColor" stopOpacity=".8" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs><g fill="none" stroke="url(#painel-linha-degrade)" strokeWidth="0.6">{LINHAS_FLUIDAS.map((d) => <path key={d} d={d} />)}</g><g className="painel-ambiente-laser">{LINHAS_FLUIDAS.map((d) => <path key={d} d={d} />)}</g></svg><canvas ref={ref} className="painel-ambiente-chuva" /></div>;
}
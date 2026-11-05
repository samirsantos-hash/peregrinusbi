import { useEffect, useRef } from "react";

/** Ambiente contínuo independente das consultas; animação local, sem rede. */
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
  return <div className="painel-ambiente" aria-hidden="true"><div className="painel-ambiente-fumaca" /><canvas ref={ref} className="painel-ambiente-chuva" /></div>;
}
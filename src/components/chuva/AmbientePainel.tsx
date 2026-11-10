import { useEffect, useRef } from "react";

/** Ambiente contínuo independente das consultas; animação local, sem rede. */
const LINHAS_FLUIDAS = ["M -80,40 C 180,90 220,320 180,500 C 140,680 80,820 -60,940", "M -20,-20 C 260,50 320,280 280,520 C 240,740 180,900 0,1000", "M 10,-50 C 300,30 370,260 330,530 C 290,770 230,940 30,1030", "M 40,-80 C 340,10 420,240 380,540 C 340,800 280,980 60,1060", "M 1520,40 C 1260,90 1220,320 1260,500 C 1300,680 1360,820 1500,940", "M 1460,-20 C 1180,50 1120,280 1160,520 C 1200,740 1260,900 1440,1000", "M 1430,-50 C 1140,30 1070,260 1110,530 C 1150,770 1210,940 1410,1030", "M 1400,-80 C 1100,10 1020,240 1060,540 C 1100,800 1160,980 1380,1060"];
const LINHAS_DESTAQUE = ["M -50,10 C 220,70 270,300 230,510 C 190,710 130,860 -30,970", "M 1490,10 C 1220,70 1170,300 1210,510 C 1250,710 1310,860 1470,970"];
const LINHAS_ECO = ["M -100,350 C 60,250 140,120 180,-60", "M -80,390 C 90,280 180,140 220,-40", "M 1540,550 C 1380,650 1300,780 1260,960", "M 1520,510 C 1350,620 1260,760 1220,940"];

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
  return <div className="painel-ambiente" aria-hidden="true"><div className="painel-ambiente-fumaca" /><svg className="painel-ambiente-linhas" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"><g fill="none" strokeWidth="0.8" className="painel-linha-suave">{LINHAS_FLUIDAS.map((d) => <path key={d} d={d} />)}<g opacity="0.6">{LINHAS_ECO.map((d) => <path key={d} d={d} />)}</g></g><g fill="none" strokeWidth="0.9" className="painel-linha-destaque">{LINHAS_DESTAQUE.map((d) => <path key={d} d={d} />)}</g></svg><canvas ref={ref} className="painel-ambiente-chuva" /></div>;
}
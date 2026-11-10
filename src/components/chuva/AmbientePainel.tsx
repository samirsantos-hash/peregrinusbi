import { useEffect, useRef } from "react";

/** Ambiente contínuo independente das consultas; animação local, sem rede. */
const LINHAS_FLUIDAS = ["M -50,-50 Q 150,150 350,-50", "M -50,0 Q 200,200 400,-50", "M -50,50 Q 250,250 450,-50", "M -50,100 Q 300,300 500,-50", "M-100,150 C200,300 400,100 650,250 C900,400 1150,150 1550,350", "M-100,190 C200,340 400,140 650,290 C900,440 1150,190 1550,390", "M-100,230 C200,380 400,180 650,330 C900,480 1150,230 1550,430", "M-100,270 C200,420 400,220 650,370 C900,520 1150,270 1550,470", "M-100,600 C300,500 600,900 1000,600 C1250,400 1350,700 1550,550", "M-100,640 C300,540 600,940 1000,640 C1250,440 1350,740 1550,590", "M-100,680 C300,580 600,980 1000,680 C1250,480 1350,780 1550,630", "M-100,720 C300,620 600,1020 1000,720 C1250,520 1350,820 1550,670", "M 1200,950 Q 1350,750 1550,950", "M 1150,950 Q 1300,700 1550,900", "M 1100,950 Q 1250,650 1550,850", "M 1050,950 Q 1200,600 1550,800"];

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
  return <div className="painel-ambiente" aria-hidden="true"><div className="painel-ambiente-fumaca" /><svg className="painel-ambiente-linhas" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="currentColor" strokeWidth="1.5">{LINHAS_FLUIDAS.map((d) => <path key={d} d={d} />)}</g><g className="painel-ambiente-brilho">{LINHAS_FLUIDAS.map((d) => <path key={d} d={d} />)}</g></svg><canvas ref={ref} className="painel-ambiente-chuva" /></div>;
}
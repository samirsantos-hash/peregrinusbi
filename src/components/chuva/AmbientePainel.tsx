import { useEffect, useRef } from "react";

/** Ambiente contínuo independente das consultas; animação local, sem rede. */
const LINHAS_FLUIDAS = ["M 1290,290 C 1325,350 1320,440 1285,505 C 1250,560 1225,510 1235,430 C 1245,355 1265,250 1290,290 Z","M 1370,160 C 1350,230 1370,360 1345,460 C 1315,580 1240,630 1200,690 C 1170,740 1195,830 1250,910","M 1410,110 C 1370,210 1400,340 1375,475 C 1345,620 1250,670 1190,740 C 1140,800 1150,880 1200,940","M 1440,60 C 1390,180 1420,320 1395,490 C 1360,650 1250,710 1170,780 C 1100,840 1110,920 1150,970","M 1460,10 C 1400,160 1440,300 1410,510 C 1370,680 1240,750 1145,820 C 1060,880 1070,950 1100,1000","M 1340,-30 C 1310,120 1400,260 1380,480 C 1350,670 1210,760 1110,845 C 1010,920 1020,990 1040,1040","M 1190,-60 C 1230,100 1340,220 1320,440 C 1290,640 1150,750 1060,850 C 970,930 960,1010 990,1070","M 1040,-70 C 1120,110 1250,210 1230,420 C 1200,610 1070,730 980,840 C 900,930 890,1020 920,1090"];

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
  return <div className="painel-ambiente" aria-hidden="true"><div className="painel-ambiente-fumaca" /><svg className="painel-ambiente-linhas" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="painel-linha-degrade" x1="100%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="currentColor" stopOpacity=".9" /><stop offset="45%" stopColor="currentColor" stopOpacity=".45" /><stop offset="85%" stopColor="currentColor" stopOpacity=".1" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs><g fill="none" stroke="url(#painel-linha-degrade)" strokeWidth="0.65">{LINHAS_FLUIDAS.map((d) => <path key={d} d={d} />)}</g><g className="painel-ambiente-laser">{LINHAS_FLUIDAS.map((d) => <path key={d} d={d} />)}</g></svg><canvas ref={ref} className="painel-ambiente-chuva" /></div>;
}
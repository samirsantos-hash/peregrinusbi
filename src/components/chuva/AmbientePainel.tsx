import { useEffect, useRef } from "react";

/**
 * Topologia de curvas de nível com meandros orgânicos (fiel ao relevo de referência).
 * Desenvolvem-se pelas margens, descendo em "S" e liberando o centro de leitura.
 */
const LINHAS_TOPOGRAFICAS = [
  // Flanco Direito: Crista principal alongada e curvas concêntricas
  "M 1480,20 C 1320,110 1280,260 1240,430 C 1205,580 1260,690 1340,780 C 1420,870 1460,940 1520,1020",
  "M 1450,-20 C 1290,80 1240,240 1200,420 C 1160,590 1220,720 1310,810 C 1390,890 1430,970 1480,1050",
  "M 1420,-60 C 1250,50 1195,220 1155,410 C 1115,610 1180,740 1270,840 C 1350,920 1390,1000 1440,1080",
  "M 1380,-100 C 1200,20 1140,200 1100,400 C 1060,630 1130,770 1220,870 C 1300,950 1340,1030 1390,1110",
  // Laço do cume (península do relevo)
  "M 1320,310 C 1260,370 1250,470 1290,530 C 1330,580 1370,550 1380,470 C 1390,390 1370,300 1320,310 Z",
  
  // Flanco Esquerdo: Ondulações suaves e amplas para equilíbrio periférico
  "M -80,120 C 140,190 190,380 150,560 C 110,720 40,860 -70,980",
  "M -60,60 C 180,140 230,350 190,550 C 150,730 70,880 -40,1020",
  "M -30,0 C 220,90 280,320 230,540 C 190,750 110,910 0,1050",
  "M 0,-60 C 260,40 320,290 270,530 C 220,760 140,940 30,1080"
];

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
      // Brilho ambiente suave na borda direita
      const gradienteLuz = ctx.createRadialGradient(width * 0.85, height * 0.45, 10, width * 0.85, height * 0.45, width * 0.45);
      gradienteLuz.addColorStop(0, "rgba(48, 209, 88, 0.05)");
      gradienteLuz.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradienteLuz;
      ctx.fillRect(0, 0, width, height);
    };

    const tick = (time: number) => {
      if (time - last >= 60) {
        elapsed += last ? Math.min((time - last) / 1000, 0.1) : 0;
        last = time;
        draw();
      }
      frame = requestAnimationFrame(tick);
    };

    resize();
    if (!motion.matches) frame = requestAnimationFrame(tick);

    const onResize = () => { resize(); draw(); };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="painel-ambiente" aria-hidden="true">
      {/* Luz ambiente de fundo (Mist) */}
      <div className="painel-ambiente-fumaca" />

      {/* SVG de Topologia Fiel com Máscara e Gradientes */}
      <svg className="painel-ambiente-linhas" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          {/* Degradê orgânico que suaviza nas pontas e desaparece no centro */}
          <linearGradient id="painel-topo-gradiente" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#30d158" stopOpacity="0.25" />
            <stop offset="40%" stopColor="#30d158" stopOpacity="0.10" />
            <stop offset="75%" stopColor="#30d158" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#30d158" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Linhas Base Finas (Topografia Elegante) */}
        <g fill="none" stroke="url(#painel-topo-gradiente)" strokeWidth="0.65">
          {LINHAS_TOPOGRAFICAS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>

        {/* Feixes de Laser Animados que percorrem as linhas */}
        <g className="painel-ambiente-laser">
          {LINHAS_TOPOGRAFICAS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </svg>

      <canvas ref={ref} className="painel-ambiente-chuva" />
    </div>
  );
}
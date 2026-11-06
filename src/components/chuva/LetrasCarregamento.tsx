import { useEffect, useRef } from "react";
import "./letras-carregamento.css";

/** Decorative glyphs only: never reads or changes page text. */
export function LetrasCarregamento({ saindo }: { saindo: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const letras = "ECOMPEREGRINUSABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const passo = 30;
    let colunas: { y: number; velocidade: number; caracteres: string }[] = [];
    let largura = 0, altura = 0, raf = 0, anterior = 0;
    const resize = () => {
      largura = innerWidth; altura = innerHeight;
      const escala = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(largura * escala); canvas.height = Math.round(altura * escala);
      ctx.setTransform(escala, 0, 0, escala, 0, 0);
      colunas = Array.from({ length: Math.ceil(largura / passo) }, () => ({
        y: Math.random() * (altura + 160) - 160, velocidade: 70 + Math.random() * 100,
        caracteres: Array.from({ length: 9 }, () => letras[Math.floor(Math.random() * letras.length)]).join(""),
      }));
    };
    const frame = (tempo: number) => {
      raf = 0;
      if (motion.matches || document.hidden) { anterior = 0; ctx.clearRect(0, 0, largura, altura); return; }
      if (tempo - anterior >= 1000 / 24) {
        const dt = anterior ? Math.min((tempo - anterior) / 1000, .1) : 0;
        anterior = tempo;
        const style = getComputedStyle(canvas);
        ctx.clearRect(0, 0, largura, altura);
        ctx.font = `13px ${style.fontFamily}`;
        ctx.fillStyle = `hsl(${style.getPropertyValue("--primary").trim()})`;
        colunas.forEach((c, i) => {
          c.y += c.velocidade * dt;
          if (c.y > altura + 160) c.y = -Math.random() * altura - 30;
          for (let j = 0; j < c.caracteres.length; j++) {
            ctx.globalAlpha = .36 * (1 - j / c.caracteres.length);
            ctx.fillText(c.caracteres[j], i * passo + 8, c.y - j * 18);
          }
        });
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(frame);
    };
    const sync = () => { cancelAnimationFrame(raf); anterior = 0; raf = requestAnimationFrame(frame); };
    resize(); sync();
    window.addEventListener("resize", resize);
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); motion.removeEventListener("change", sync); document.removeEventListener("visibilitychange", sync); };
  }, []);
  return <div aria-hidden="true" className={`letras-carregamento ${saindo ? "letras-carregamento--saindo" : ""}`}><canvas ref={ref} /></div>;
}
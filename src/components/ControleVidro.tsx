import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const CHAVE = "peregrinus:glass-intensity";
const ler = () => { const v = parseFloat(localStorage.getItem(CHAVE) || ""); return Number.isFinite(v) && v >= 0.2 && v <= 1.8 ? v : 1; };

export function ControleVidro() {
  const { theme } = useTheme();
  const [intensidade, setIntensidade] = useState(ler);
  useEffect(() => {
    document.documentElement.style.setProperty("--glass-intensity", String(intensidade));
    try { localStorage.setItem(CHAVE, String(intensidade)); } catch { /* sem armazenamento */ }
  }, [intensidade]);
  if (theme !== "dark") return null;
  return (
    <div className="glass-slider-container fixed bottom-4 left-[4.25rem] z-50 hidden sm:flex">
      <SlidersHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden />
      <label htmlFor="controle-vidro" className="text-xs font-medium text-muted-foreground">Efeito vidro</label>
      <input id="controle-vidro" type="range" min="0.2" max="1.8" step="0.1" value={intensidade}
        onChange={(e) => setIntensidade(parseFloat(e.target.value))}
        aria-valuetext={`${Math.round(intensidade * 100)}%`} className="glass-slider" />
    </div>
  );
}

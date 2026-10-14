import { cn } from "@/lib/utils";
import aguiaImg from "@/assets/aguia-peregrinus.png";

/** Silhueta da águia com asas batendo em 3D (CSS perspective). */
export function AguiaSvg({ className, sombra }: { className?: string; sombra?: boolean }) {
  const corpo = sombra ? "currentColor" : "url(#aguia-metal)";
  const asa = sombra ? "currentColor" : "url(#aguia-asa)";
  return (
    <svg viewBox="0 0 200 120" className={cn("aguia overflow-visible", className)} aria-hidden>
      {!sombra && (
        <defs>
          <linearGradient id="aguia-metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="hsl(0 0% 100%)" />
            <stop offset="1" stopColor="hsl(186 60% 72%)" />
          </linearGradient>
          <linearGradient id="aguia-asa" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="hsl(185 100% 70%)" />
            <stop offset="0.6" stopColor="hsl(190 80% 45%)" />
            <stop offset="1" stopColor="hsl(200 70% 25%)" />
          </linearGradient>
        </defs>
      )}
      <g className="aguia-asa aguia-asa-e">
        <path fill={asa} d="M96 52 C80 40 55 26 8 22 C22 32 30 36 36 40 C26 40 18 42 12 46 C30 48 44 50 54 54 C46 56 40 60 36 66 C58 62 78 62 94 64 Z" />
      </g>
      <g className="aguia-asa aguia-asa-d">
        <path fill={asa} d="M104 52 C120 40 145 26 192 22 C178 32 170 36 164 40 C174 40 182 42 188 46 C170 48 156 50 146 54 C154 56 160 60 164 66 C142 62 122 62 106 64 Z" />
      </g>
      <path fill={corpo} d="M100 34 C106 34 109 39 108 44 L114 44 L108 49 C110 58 110 70 106 82 L112 96 L100 90 L88 96 L94 82 C90 70 90 58 92 49 C91 41 94 34 100 34 Z" />
      {!sombra && <circle cx="103" cy="40" r="1.4" fill="hsl(200 70% 15%)" />}
    </svg>
  );
}

export default function AguiaLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-[22%] bg-card shadow-[0_4px_14px_hsl(var(--foreground)/0.18)]",
        className,
      )}
      aria-label="Ecom Peregrinus"
      role="img"
    >
      <span className="aguia-flutua block h-full w-full"><img src={aguiaImg} alt="" className="h-full w-full object-cover" draggable={false} /></span>
    </div>
  );
}

/** Sombra gigante da águia sobrevoando a tela (decorativa). */
export function SombraAguia() {
  return (
    <div className="aguia-voo pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="aguia-voo-trilha">
        <AguiaSvg sombra className="w-[min(70vw,640px)] text-foreground/[0.07] blur-[6px]" />
      </div>
    </div>
  );
}

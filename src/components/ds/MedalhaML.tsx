import { cn } from "@/lib/utils";

/** Medalha MercadoLíder no estilo oficial: fita, disco com metade sombreada e check. */
export function MedalhaML({ tier, className }: { tier: 1 | 2 | 3 | null; className?: string }) {
  const cor = tier === 1 ? "text-medal-platinum" : tier === 2 ? "text-medal-gold" : tier === 3 ? "text-medal-mercadolider" : "text-muted-foreground/40";
  return <svg viewBox="0 0 64 80" className={cn(cor, className)} aria-hidden>
    <path d="M20 2h24v16l-12 6-12-6z" fill="currentColor" opacity="0.75" />
    <circle cx="32" cy="48" r="28" fill="currentColor" />
    <path d="M32 20a28 28 0 0 0 0 56z" fill="black" opacity="0.12" />
    <circle cx="32" cy="48" r="20" fill="black" opacity="0.08" />
    <path d="M22 48l7 7 14-14" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

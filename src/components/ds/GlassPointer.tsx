import { useEffect } from "react";

const surfaces = ".ds-kpi, .glass-card, .ds-glass-surface, .multilojas-chart, .cartao-branco";

/** One delegated, frame-bounded reflection for all protected panel surfaces. */
export function GlassPointer() {
  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let active: HTMLElement | null = null;
    let frame = 0;
    let x = 0;
    let y = 0;
    const clear = () => {
      active?.removeAttribute("data-glass-active");
      active = null;
    };
    const move = (event: PointerEvent) => {
      if (!media.matches || event.pointerType === "touch") { clear(); return; }
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(surfaces) : null;
      if (!target?.closest(".peregrinus-panel")) { clear(); return; }
      if (active !== target) { clear(); active = target; }
      x = event.clientX;
      y = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!active) return;
        const rect = active.getBoundingClientRect();
        active.style.setProperty("--glass-x", `${x - rect.left}px`);
        active.style.setProperty("--glass-y", `${y - rect.top}px`);
        active.setAttribute("data-glass-active", "");
      });
    };
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", clear);
    window.addEventListener("blur", clear);
    media.addEventListener("change", clear);
    return () => {
      cancelAnimationFrame(frame);
      clear();
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", clear);
      window.removeEventListener("blur", clear);
      media.removeEventListener("change", clear);
    };
  }, []);
  return null;
}
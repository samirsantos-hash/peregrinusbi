import { useEffect } from "react";

const superficies = ".ds-kpi,.glass-card,.glass-card-highlight,.ds-glass-surface,.cartao-branco,.noite-vidro,.cart-card,.cart-ficha,.multilojas-chart,.carteira-kpi,[data-card-surface]";
/** Local reflection coordinates only; no tilt, page-text mutation or Home listeners. */
export function GlassPointer() {
  useEffect(() => {
    const permitido = matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let atual: HTMLElement | null = null, pressionado: HTMLElement | null = null, quadro = 0, x = 0, y = 0;
    const soltar = () => { if (pressionado) delete pressionado.dataset.cardPressed; pressionado = null; };
    const pressionar = (event: PointerEvent) => {
      soltar();
      const card = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-card-interactive]") : null;
      if (!card?.closest(".peregrinus-panel") || card.matches(":disabled,[aria-disabled='true']")) return;
      const controle = event.target instanceof Element ? event.target.closest("button,a,input,select,textarea") : null;
      if (controle && controle !== card) return;
      pressionado = card; card.dataset.cardPressed = "true";
    };
    const limpar = () => {
      if (atual) { delete atual.dataset.cardReflection; atual.style.removeProperty("--card-light-x"); atual.style.removeProperty("--card-light-y"); }
      atual = null;
    };
    const desenhar = () => {
      quadro = 0;
      if (!atual?.isConnected) { limpar(); return; }
      const rect = atual.getBoundingClientRect();
      atual.style.setProperty("--card-light-x", `${x - rect.left}px`);
      atual.style.setProperty("--card-light-y", `${y - rect.top}px`);
    };
    const mover = (event: PointerEvent) => {
      if (!permitido.matches || event.pointerType === "touch") { limpar(); return; }
      const alvo = event.target instanceof Element ? event.target.closest<HTMLElement>(superficies) : null;
      const card = alvo?.closest(".peregrinus-panel") && !alvo.closest(".panel-sidebar,.panel-topbar,.painel-navigation,.cart-header,.cart-tabs-sticky") ? alvo : null;
      if (card !== atual) { limpar(); atual = card; if (atual) atual.dataset.cardReflection = "true"; }
      x = event.clientX; y = event.clientY;
      if (atual && !quadro) quadro = requestAnimationFrame(desenhar);
    };
    document.addEventListener("pointermove", mover, { passive: true });
    document.addEventListener("pointerdown", pressionar, { passive: true });
    document.addEventListener("pointerup", soltar);
    document.addEventListener("pointercancel", soltar);
    document.addEventListener("pointerleave", limpar);
    document.addEventListener("pointercancel", limpar);
    window.addEventListener("blur", limpar);
    permitido.addEventListener("change", limpar);
    window.addEventListener("blur", soltar);
    return () => { cancelAnimationFrame(quadro); limpar(); soltar(); document.removeEventListener("pointerdown", pressionar); document.removeEventListener("pointerup", soltar); document.removeEventListener("pointercancel", soltar); window.removeEventListener("blur", soltar); document.removeEventListener("pointermove", mover); document.removeEventListener("pointerleave", limpar); document.removeEventListener("pointercancel", limpar); window.removeEventListener("blur", limpar); permitido.removeEventListener("change", limpar); };
  }, []);
  return null;
}
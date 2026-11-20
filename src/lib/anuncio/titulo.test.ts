import { describe, it, expect } from "vitest";
import { analisarTitulo } from "./titulo";
describe("analisador editorial de título v2", () => {
  it("não penaliza comprimento nem usa corte estimado na nota", () => {
    const t = "Kit Troca Oleo 5w30 Filtros Onix Tracker Spin 1.0 Turbo 2020 a 2024";
    const d = analisarTitulo(t, { limitePlataforma: 60, corteVisual: 45 });
    expect(d.comprimento).toBeGreaterThan(60);
    expect(d.excedeLimite).toBe(true);
    expect(d.nota).toBe(1);
    expect(analisarTitulo(t, { limitePlataforma: 100, corteVisual: 100 }).nota).toBe(d.nota);
  });
  it("preserva ausência de limite sem assumir 60", () => { expect(analisarTitulo("Kit Filtros Onix").excedeLimite).toBeNull(); });
  it("preserva decimais, códigos, viscosidade, polegadas e medidas", () => {
    const t = 'Filtro HR-V C-180 1,6 5W/30 10x20 185/65/15 15"';
    expect(analisarTitulo(t).tituloLimpo).toBe(t);
    expect(analisarTitulo(t).achados).toEqual([]);
  });
  it("detecta repetição sem duplicar contagem de marca", () => {
    const d = analisarTitulo("Pastilha Bosch Freio Bosch", { marca: "Bosch" });
    expect(d.achados.filter(a => a.tipo === "repeticao")).toHaveLength(1);
    expect(d.achados[0].ocorrencias).toBe(2);
    expect(d.tituloLimpo).toBe("Pastilha Bosch Freio");
  });
  it("não conta áreas sobrepostas duas vezes", () => {
    const d = analisarTitulo("Kit Oferta Oferta em oferta");
    expect(d.caracteresDesperdicados).toBeLessThanOrEqual(d.comprimento);
    expect(d.densidadeUtil).toBeGreaterThanOrEqual(0);
  });
  it("preserva termos sem demanda confirmada na sugestão", () => { expect(analisarTitulo("Filtro Original Promoção").tituloLimpo).toBe("Filtro Original Promoção"); });
  it("não exige modelo e ano para outras categorias", () => { expect(analisarTitulo("Caderno Escolar Azul").nota).toBe(1); });
  it("ignora repetições funcionais e numéricas", () => { expect(analisarTitulo("Jogo de Pneus de Aro 15 185 65 15").achados.filter(a => a.tipo === "repeticao")).toHaveLength(0); });
  it("remove pontuação editorial e emoji sem tocar na motorização", () => { expect(analisarTitulo("Kit, Filtro - Onix 1.0 🔥").tituloLimpo).toBe("Kit Filtro Onix 1.0"); });
  it("posiciona termo no limite visual sem erro de espaço", () => { expect(analisarTitulo("Kit 2020", { corteVisual: 8 }).chaveForaDaVisao).toEqual([]); });
});
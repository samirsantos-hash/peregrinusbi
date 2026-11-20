import { describe, it, expect } from "vitest";
import { avaliarRuptura } from "@/lib/rupturaApi";

const base = { itemId: "MLB1", titulo: "x", estoque: 10, preco: 50, saude: 0.6, logistica: "xd_drop_off", vendas7d: 70, perguntas30d: 0, emPromocao: false, promocaoDisponivel: true };

describe("avaliarRuptura", () => {
  it("cobertura < 7 dias é ruptura e envio cobre 28 dias", () => {
    const r = avaliarRuptura(base);
    expect(r.cobertura).toBe(1);
    expect(r.severidade).toBe("critical");
    expect(r.envio).toBe(270);
    expect(r.valorEnvio).toBe(13500);
  });
  it("qualidade abaixo de 70 e promoção disponível geram ações", () => {
    const r = avaliarRuptura(base);
    expect(r.qualidade).toBe(60);
    expect(r.acoes).toContain("Melhorar qualidade");
    expect(r.acoes).toContain("Ativar promoção");
  });
  it("sem venda observada não inventa cobertura", () => {
    const r = avaliarRuptura({ ...base, vendas7d: null });
    expect(r.cobertura).toBeNull();
    expect(r.severidade).toBe("sem");
  });
  it("zero venda paga em 7 dias sugere envio 0", () => {
    const r = avaliarRuptura({ ...base, vendas7d: 0 });
    expect(r.envio).toBe(0);
    expect(r.cobertura).toBeNull();
  });
});

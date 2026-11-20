/**
 * Funil de 5 etapas para o Resumo (Growth).
 * Visitas e PDP vêm da mesma fonte real (no ML, visita ≈ abertura da PDP).
 * Só etapas reais: a base não mede carrinho nem checkout, então não aparecem.
 */

export type FonteEtapa = "real" | "estimativa";

export interface EtapaFunil5 {
  id: "visitas" | "pdp" | "atc" | "checkout" | "pedidos";
  nome: string;
  valor: number;
  fonte: FonteEtapa;
  /** Nota curta exibida no funil (origem do número). */
  nota?: string;
}

export interface AbandonoFunil {
  de: string;
  para: string;
  /** Fração que não avançou (0–1). */
  taxa: number;
  perdidos: number;
  /** True se alguma ponta da transição é estimativa. */
  estimado: boolean;
}

export interface FunilCincoEtapas {
  etapas: EtapaFunil5[];
  /** Pedidos ÷ visitas (conversão oficial única do Resumo). */
  cvr: number | null;
  maiorAbandono: AbandonoFunil | null;
}

/** Mantida apenas para referência histórica; não usada. */
/** Interpolação geométrica: V × (P/V)^t, com t ∈ (0,1). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function geom(visitas: number, pedidos: number, t: number): number {
  if (visitas <= 0 || pedidos <= 0) return 0;
  const ratio = Math.min(1, pedidos / visitas);
  return visitas * Math.pow(ratio, t);
}

function escolherMaior(abandonos: AbandonoFunil[]): AbandonoFunil | null {
  if (abandonos.length === 0) return null;
  return abandonos.reduce((m, a) => {
    if (a.taxa > m.taxa + 1e-9) return a;
    if (Math.abs(a.taxa - m.taxa) <= 1e-9 && a.perdidos > m.perdidos) return a;
    return m;
  });
}

export function funilCincoEtapas(visitas: number, pedidos: number): FunilCincoEtapas {
  const V = Math.max(0, Number(visitas) || 0);
  const Pbruto = Math.max(0, Number(pedidos) || 0);
  // Pedidos não podem superar visitas no desenho do funil (protege base inconsistente).
  const P = V > 0 ? Math.min(Pbruto, V) : Pbruto;


  const etapas: EtapaFunil5[] = [
    { id: "visitas", nome: "Visitas", valor: Math.round(V), fonte: "real", nota: "Aberturas do anúncio (dado real)" },
    {
      id: "pedidos",
      nome: "Unidades vendidas",
      valor: Math.round(P),
      fonte: "real",
      nota: "Vendas registradas (dado real)",
    },
  ];

  const abandonos: AbandonoFunil[] = [];
  for (let i = 1; i < etapas.length; i++) {
    const prev = etapas[i - 1];
    const cur = etapas[i];
    if (prev.valor <= 0) continue;
    const taxa = Math.max(0, 1 - cur.valor / prev.valor);
    if (taxa <= 0) continue;
    abandonos.push({
      de: prev.nome,
      para: cur.nome,
      taxa,
      perdidos: Math.max(0, prev.valor - cur.valor),
      estimado: prev.fonte === "estimativa" || cur.fonte === "estimativa",
    });
  }

  return {
    etapas,
    cvr: V > 0 ? P / V : null,
    maiorAbandono: escolherMaior(abandonos),
  };
}

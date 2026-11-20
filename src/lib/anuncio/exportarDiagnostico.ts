import * as XLSX from 'xlsx';
import { CORTES_PADRAO, EIXO_DA_DIMENSAO, PESOS, ROTULO_DIMENSAO, ROTULO_QUADRANTE, type Diagnostico, type Dimensao, type lotesDeCorrecao } from './diagnostico';

type Lote = ReturnType<typeof lotesDeCorrecao>[number];
export interface ExportacaoDiagnostico {
  custId: string;
  periodo: { inicio: string; fim: string };
  lotes: Lote[];
  porMlb: Map<string, Diagnostico>;
  titulos: Map<string, string>;
}

// Keep listing text literal, including characters Excel could interpret as a formula.
const texto = (s: string) => /^[\s]*[=+\-@]/.test(s) ? `'${s}` : s;
const nomeLote = (g: string) => g === 'indefinido' ? 'Sem gargalo definido' : ROTULO_DIMENSAO[g as Dimensao];

export function criarExcelDiagnostico(dados: ExportacaoDiagnostico): ArrayBuffer {
  const anuncios: Record<string, string | number | null>[] = [];
  const dimensoes: Record<string, string | number | null>[] = [];
  for (const lote of dados.lotes) for (const item of lote.itens) {
    const d = dados.porMlb.get(item.mlb);
    if (!d) throw new Error('Diagnóstico do anúncio não disponível. Atualize antes de exportar.');
    anuncios.push({
      'Cust ID': texto(dados.custId), 'Início do período': dados.periodo.inicio, 'Fim do período': dados.periodo.fim,
      Lote: nomeLote(lote.gargalo), MLB: texto(item.mlb), Título: texto(dados.titulos.get(item.mlb) ?? ''),
      Quadrante: d.quadrante ? ROTULO_QUADRANTE[d.quadrante] : 'Diagnóstico indisponível',
      'Construção (0–100)': d.construcao.indice, 'Resposta (0–100)': d.resposta.indice,
      'Cobertura Construção': d.construcao.cobertura, 'Cobertura Resposta': d.resposta.cobertura,
      Confiança: d.confianca === 'media' ? 'média' : d.confianca,
      'Faturamento (R$)': item.faturamentoCents / 100, Prioridade: item.prioridade,
      'Ação sugerida': texto(item.acao ?? ''),
    });
    for (const eixo of [d.construcao, d.resposta]) for (const n of eixo.dimensoes) {
      dimensoes.push({ MLB: texto(item.mlb), Lote: nomeLote(lote.gargalo),
        Eixo: eixo.eixo === 'construcao' ? 'Construção' : 'Resposta', Dimensão: ROTULO_DIMENSAO[n.dimensao],
        Peso: n.peso, 'Nota (0–100)': n.nota === null ? null : n.nota * 100,
        Medição: n.nota === null ? 'Sem medição' : 'Medida', Evidência: texto(n.evidencia), 'Ação sugerida': texto(n.acao ?? ''),
      });
    }
  }
  const criterios = [
    ['Critério', 'Valor'],
    ['Escopo', 'Somente os lotes exportados da fila de ação exibida (até 50 anúncios); não é o catálogo inteiro.'],
    ['Período de vendas e Resposta', `${dados.periodo.inicio} a ${dados.periodo.fim}`],
    ['Construção', 'Condição atual lida do anúncio; não é uma fotografia histórica do período de vendas.'],
    ['Ausências', 'Notas em branco = sem medição. Zero numérico = medição confirmada.'],
    ['Índice de cada eixo', 'Soma de (nota 0–1 × peso medido) ÷ soma dos pesos medidos × 100.'],
    ['Cobertura de cada eixo', 'Soma dos pesos medidos ÷ soma de todos os pesos do eixo.'],
    ['Confiança', 'Média das coberturas: alta ≥80%; média ≥50%; baixa <50%.'],
    ['Corte Construção (provisório)', CORTES_PADRAO.construcao],
    ['Corte Resposta (provisório)', CORTES_PADRAO.resposta],
    ['Limitações', 'Notas internas, não oficiais do Mercado Livre. Ausências não garantem confiança alta nem ganho de vendas.'],
    [], ['Dimensão', 'Eixo', 'Peso'],
    ...(Object.keys(PESOS) as Dimensao[]).map(dim => [ROTULO_DIMENSAO[dim], EIXO_DA_DIMENSAO[dim] === 'construcao' ? 'Construção' : 'Resposta', PESOS[dim]]),
  ];
  const wb = XLSX.utils.book_new();
  const a = XLSX.utils.json_to_sheet(anuncios);
  const b = XLSX.utils.json_to_sheet(dimensoes);
  const c = XLSX.utils.aoa_to_sheet(criterios);
  a['!cols'] = Object.keys(anuncios[0] ?? {}).map(k => ({ wch: k === 'Título' || k === 'Ação sugerida' ? 55 : 23 }));
  b['!cols'] = [18, 25, 18, 25, 10, 18, 18, 75, 55].map(wch => ({ wch }));
  c['!cols'] = [{ wch: 35 }, { wch: 110 }, { wch: 12 }];
  for (const sheet of [a, b]) {
    if (sheet['!ref']) sheet['!autofilter'] = { ref: sheet['!ref'] };
    for (const [key, cell] of Object.entries(sheet)) {
      if (key.startsWith('!') || typeof cell !== 'object' || cell === null || !('t' in cell) || cell.t !== 'n') continue;
      const numero = cell as { t: string; z?: string };
      numero.z = '#,##0.00;(#,##0.00);0.00';
      if (sheet === a && /^[JK]\d+$/.test(key)) numero.z = '0.0%';
    }
  }
  XLSX.utils.book_append_sheet(wb, a, 'Anúncios');
  XLSX.utils.book_append_sheet(wb, b, 'Dimensões');
  XLSX.utils.book_append_sheet(wb, c, 'Critérios');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}
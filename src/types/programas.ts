// Modelo de dados da aba "Programas". Fonte da verdade — nenhum campo fora daqui.

export type EstadoAlavanca =
  | 'ativo'
  | 'parcial'
  | 'nao_ativado'
  | 'nao_elegivel'
  | 'sem_dado';

export type StatusOkr = 'verde' | 'atencao' | 'critico' | 'sem_dado';

export type Procedencia = 'real' | 'estimado' | 'derivado';

export interface Metrica {
  valor: number | null;
  unidade: 'BRL' | 'pct' | 'un' | 'indice' | 'dias';
  procedencia: Procedencia;
  fonte: string;
  atualizadoEm: string;
  formula?: string;
}

export interface Programa {
  id: string;
  nome: string;
  marca: string;
  marketplace: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  corAcento: string;
  metodoAtribuicao: string;
}

export interface NivelCascata {
  rotulo: string;
  meta: Metrica;
  destaque: boolean;
}

export interface Alavanca {
  id: string;
  nome: string;
  descricaoCurta: string;
  estado: EstadoAlavanca;
  ativoDesde: string | null;
  valorAtual: Metrica;
  valorContratado: Metrica;
  resultadoAtribuido: Metrica;
  impactoEstimado: Metrica;
  parceiroResponsavelId: string | null;
  proximaAcao: string | null;
}

export interface Okr {
  id: string;
  nome: string;
  metricaNome: string;
  atual: Metrica;
  meta: Metrica;
  metaTipo: 'minimo' | 'maximo' | 'faixa' | 'booleano' | 'categoria';
  metaFaixa?: [number, number];
  metaCategoria?: string;
  historico: { periodo: string; valor: number | null }[];
  status: StatusOkr;
  responsavel: string | null;
}

export interface Parceiro {
  id: string;
  nome: string;
  papel: string;
  contato: string | null;
  ultimaInteracao: string | null;
}

export interface CategoriaEscopo {
  id: string;
  nome: string;
  skusCatalogo: Metrica;
  skusAnunciados: Metrica;
  coberturaPct: Metrica;
  gmv12m: Metrica;
  potencial: Metrica;
  gapBrl: Metrica;
  fullAtivo: boolean | null;
  prioritario: boolean;
}

export interface EventoTimeline {
  id: string;
  data: string;
  tipo: 'marco_okr' | 'ativacao_alavanca' | 'campanha' | 'mudanca_grupo' | 'outro';
  titulo: string;
  descricao: string | null;
}

export interface Participacao {
  id: string;
  lojaId: string;
  programaId: string;
  sellerId: string;
  grupo: string;
  grupoDescricao: string;
  cascata: NivelCascata[];
  realizado: Metrica;
  potencial: Metrica;
  crescimentoYoY: Metrica;
  alavancas: Alavanca[];
  okrs: Okr[];
  parceiros: Parceiro[];
  categorias: CategoriaEscopo[];
  timeline: EventoTimeline[];
  coberturaDadosPct: number;
  atualizadoEm: string;
}

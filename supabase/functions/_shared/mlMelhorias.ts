// Melhorias de anúncio: achados por regras fixas + texto da IA. Sem I/O.
// A IA só sugere; nada daqui escreve no Mercado Livre.

export type Frente = "qualidade_ml" | "ficha" | "titulo" | "descricao" | "fotos";
export type Gravidade = "alta" | "media" | "baixa";
export type Achado = { frente: Frente; gravidade: Gravidade; texto: string; link?: string | null };

/** Limites das regras próprias do painel (o ML não publica esses números). */
export const LIMITES = {
  /** Caracteres livres no título a partir dos quais o painel aponta espaço sobrando. */
  folgaTitulo: 10,
  /** Descrição abaixo disso é apontada como curta. */
  descricaoCurta: 200,
  /** Fotos: mínimo e recomendado da documentação de imagens do ML (px no menor lado). */
  fotoMinima: 500,
  fotoRecomendada: 1200,
  /** Quantos atributos opcionais vazios citar pelo nome. */
  opcionaisCitados: 10,
};

const txt = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

// ── Qualidade do ML (/item/{id}/performance) ────────────────────────────────

export type Pendencia = { grupo: string | null; titulo: string; acao: string | null; link: string | null; modo: string | null };
export type Qualidade = { score: number | null; nivel: string | null; calculado_em: string | null; pendencias: Pendencia[] };

export function lerQualidade(json: unknown): Qualidade | null {
  if (!json || typeof json !== "object") return null;
  const q = json as Record<string, unknown>;
  const pendencias: Pendencia[] = [];
  for (const b of Array.isArray(q.buckets) ? q.buckets : []) {
    const bucket = b as Record<string, unknown>;
    for (const v of Array.isArray(bucket.variables) ? bucket.variables : []) {
      const variavel = v as Record<string, unknown>;
      for (const r of Array.isArray(variavel.rules) ? variavel.rules : []) {
        const regra = r as Record<string, unknown>;
        if (regra.status !== "PENDING") continue;
        const w = (regra.wordings ?? {}) as Record<string, unknown>;
        const titulo = txt(w.title) ?? txt(variavel.title);
        if (!titulo) continue;
        pendencias.push({ grupo: txt(bucket.title), titulo, acao: txt(w.label), link: txt(w.link), modo: txt(regra.mode) });
      }
    }
  }
  return { score: num(q.score), nivel: txt(q.level_wording) ?? txt(q.level), calculado_em: txt(q.calculated_at), pendencias };
}

// ── Categoria ───────────────────────────────────────────────────────────────

export type ConfigCategoria = { nome: string | null; max_titulo: number | null; max_fotos: number | null; max_descricao: number | null };

export function lerCategoria(json: unknown): ConfigCategoria {
  const c = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const s = c.settings && typeof c.settings === "object" ? (c.settings as Record<string, unknown>) : {};
  return { nome: txt(c.name), max_titulo: num(s.max_title_length), max_fotos: num(s.max_pictures_per_item), max_descricao: num(s.max_description_length) };
}

// ── Ficha técnica ───────────────────────────────────────────────────────────

export type AtributoRef = { id: string; nome: string };
export type Ficha = { obrigatorios: AtributoRef[]; condicionais: AtributoRef[]; opcionais_vazios: AtributoRef[]; preenchidos: { nome: string; valor: string }[] };

const IGNORAR = ["read_only", "fixed", "inferred", "others", "restricted_values"];

/** Atributo com valor ou marcado como N/A (value_id "-1") conta como preenchido. */
export function atributosDaFicha(categoria: unknown, item: unknown, condicao: string | null, idsEmVariacoes: string[] = []): Ficha {
  const preenchidos: Ficha["preenchidos"] = [];
  const ok = new Set(idsEmVariacoes);
  for (const a of Array.isArray(item) ? item : []) {
    const at = a as Record<string, unknown>;
    const id = txt(at.id);
    if (!id) continue;
    const valor = txt(at.value_name);
    if (valor || at.value_id != null) ok.add(id);
    if (valor) preenchidos.push({ nome: txt(at.name) ?? id, valor });
  }
  const ficha: Ficha = { obrigatorios: [], condicionais: [], opcionais_vazios: [], preenchidos };
  for (const a of Array.isArray(categoria) ? categoria : []) {
    const at = a as Record<string, unknown>;
    const id = txt(at.id);
    if (!id || ok.has(id)) continue;
    const tags = (at.tags ?? {}) as Record<string, unknown>;
    if (IGNORAR.some((t) => tags[t] === true)) continue;
    const ref = { id, nome: txt(at.name) ?? id };
    if (tags.required === true || (tags.new_required === true && condicao === "new")) ficha.obrigatorios.push(ref);
    else if (tags.conditional_required === true) ficha.condicionais.push(ref);
    else if (tags.hidden !== true && !(tags.new_hidden === true && condicao === "new") && !(tags.used_hidden === true && condicao !== "new")) {
      ficha.opcionais_vazios.push(ref);
    }
  }
  return ficha;
}

// ── Título, descrição e fotos ───────────────────────────────────────────────

const semAcento = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function palavrasRepetidas(titulo: string): string[] {
  const vistas = new Map<string, number>();
  for (const p of semAcento(titulo).split(/[^a-z0-9]+/)) {
    if (p.length >= 3 && !/^\d+$/.test(p)) vistas.set(p, (vistas.get(p) ?? 0) + 1);
  }
  return [...vistas].filter(([, n]) => n > 1).map(([p]) => p);
}

export function quaseTudoMaiusculo(titulo: string): boolean {
  const letras = titulo.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letras.length < 10) return false;
  const maiusculas = letras.replace(/[^A-ZÀ-Þ]/g, "").length;
  return maiusculas / letras.length > 0.7;
}

export type Foto = { largura: number | null; altura: number | null };

/** max_size é a resolução original enviada ("1200x900"); size é a exibida. */
export function lerFotos(pictures: unknown): Foto[] {
  return (Array.isArray(pictures) ? pictures : []).map((p) => {
    const tam = txt((p as Record<string, unknown>)?.max_size) ?? txt((p as Record<string, unknown>)?.size);
    const m = tam?.match(/^(\d+)x(\d+)$/);
    return m ? { largura: Number(m[1]), altura: Number(m[2]) } : { largura: null, altura: null };
  });
}

const menorLado = (f: Foto) => (f.largura != null && f.altura != null ? Math.min(f.largura, f.altura) : null);

export type Diagnostico = {
  titulo: { texto: string; tamanho: number; max: number | null };
  descricao: { tamanho: number; max: number | null };
  fotos: { quantidade: number; max: number | null; abaixo_minimo: number; abaixo_recomendado: number };
  qualidade: Qualidade | null;
  ficha: Ficha;
  achados: Achado[];
};

export function diagnosticar(e: {
  titulo: string;
  descricao: string | null;
  fotos: Foto[];
  categoria: ConfigCategoria;
  qualidade: Qualidade | null;
  ficha: Ficha;
}): Diagnostico {
  const achados: Achado[] = [];

  for (const p of e.qualidade?.pendencias ?? []) {
    achados.push({ frente: "qualidade_ml", gravidade: p.modo === "WARNING" ? "alta" : "media", texto: p.titulo, link: p.link });
  }

  const nomes = (l: AtributoRef[], n = l.length) => l.slice(0, n).map((a) => a.nome).join(", ");
  if (e.ficha.obrigatorios.length) {
    achados.push({ frente: "ficha", gravidade: "alta", texto: `Atributos obrigatórios vazios: ${nomes(e.ficha.obrigatorios)}.` });
  }
  if (e.ficha.condicionais.length) {
    achados.push({ frente: "ficha", gravidade: "media", texto: `Atributos que podem ser obrigatórios neste anúncio (conferir): ${nomes(e.ficha.condicionais)}.` });
  }
  if (e.ficha.opcionais_vazios.length) {
    const resto = e.ficha.opcionais_vazios.length - LIMITES.opcionaisCitados;
    achados.push({
      frente: "ficha",
      gravidade: "baixa",
      texto: `${e.ficha.opcionais_vazios.length} atributos opcionais vazios: ${nomes(e.ficha.opcionais_vazios, LIMITES.opcionaisCitados)}${resto > 0 ? ` e mais ${resto}` : ""}.`,
    });
  }

  const t = e.titulo.trim();
  const max = e.categoria.max_titulo;
  if (max != null && t.length > max) achados.push({ frente: "titulo", gravidade: "alta", texto: `Título com ${t.length} caracteres, acima do limite de ${max} da categoria.` });
  else if (max != null && max - t.length >= LIMITES.folgaTitulo) {
    achados.push({ frente: "titulo", gravidade: "baixa", texto: `Título usa ${t.length} de ${max} caracteres permitidos.` });
  }
  if (quaseTudoMaiusculo(t)) achados.push({ frente: "titulo", gravidade: "baixa", texto: "Título quase todo em letras maiúsculas." });
  const rep = palavrasRepetidas(t);
  if (rep.length) achados.push({ frente: "titulo", gravidade: "baixa", texto: `Palavras repetidas no título: ${rep.join(", ")}.` });

  const desc = (e.descricao ?? "").trim();
  if (!desc) achados.push({ frente: "descricao", gravidade: "alta", texto: "Anúncio sem descrição." });
  else if (desc.length < LIMITES.descricaoCurta) achados.push({ frente: "descricao", gravidade: "baixa", texto: `Descrição com ${desc.length} caracteres.` });

  const abaixoMin = e.fotos.filter((f) => (menorLado(f) ?? Infinity) < LIMITES.fotoMinima).length;
  const abaixoRec = e.fotos.filter((f) => (menorLado(f) ?? Infinity) < LIMITES.fotoRecomendada).length;
  if (!e.fotos.length) achados.push({ frente: "fotos", gravidade: "alta", texto: "Anúncio sem fotos." });
  if (abaixoMin) achados.push({ frente: "fotos", gravidade: "alta", texto: `${abaixoMin} foto(s) abaixo do mínimo de ${LIMITES.fotoMinima}×${LIMITES.fotoMinima} px.` });
  else if (abaixoRec) achados.push({ frente: "fotos", gravidade: "media", texto: `${abaixoRec} foto(s) abaixo do recomendado de ${LIMITES.fotoRecomendada}×${LIMITES.fotoRecomendada} px.` });
  if (e.fotos.length && e.categoria.max_fotos != null && e.fotos.length < e.categoria.max_fotos) {
    achados.push({ frente: "fotos", gravidade: "baixa", texto: `Usa ${e.fotos.length} de ${e.categoria.max_fotos} fotos permitidas.` });
  }

  const peso: Record<Gravidade, number> = { alta: 0, media: 1, baixa: 2 };
  achados.sort((a, b) => peso[a.gravidade] - peso[b.gravidade]);

  return {
    titulo: { texto: t, tamanho: t.length, max },
    descricao: { tamanho: desc.length, max: e.categoria.max_descricao },
    fotos: { quantidade: e.fotos.length, max: e.categoria.max_fotos, abaixo_minimo: abaixoMin, abaixo_recomendado: abaixoRec },
    qualidade: e.qualidade,
    ficha: e.ficha,
    achados,
  };
}

/** Assinatura do que a IA leria; igual → não gasta IA de novo. */
export function assinatura(valor: unknown): string {
  const s = JSON.stringify(valor);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

// ── IA ──────────────────────────────────────────────────────────────────────

export const SCHEMA_MELHORIAS = {
  type: "object",
  additionalProperties: false,
  required: ["resumo", "recomendacoes", "titulos_sugeridos", "descricao_sugerida"],
  properties: {
    resumo: { type: "string" },
    recomendacoes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["frente", "prioridade", "origem", "titulo", "texto"],
        properties: {
          frente: { type: "string", enum: ["qualidade_ml", "ficha", "titulo", "descricao", "fotos", "geral"] },
          prioridade: { type: "string", enum: ["alta", "media", "baixa"] },
          origem: { type: "string", enum: ["regra", "ia"] },
          titulo: { type: "string" },
          texto: { type: "string" },
        },
      },
    },
    titulos_sugeridos: { type: "array", items: { type: "string" } },
    descricao_sugerida: { type: "string" },
  },
};

export type DadosAnuncio = {
  item_id: string;
  titulo: string;
  categoria: string | null;
  condicao: string | null;
  preco: number | null;
  tipo_anuncio: string | null;
  catalogo: boolean;
  variacoes: string[];
  descricao: string | null;
};

export function montarPrompt(a: DadosAnuncio, d: Diagnostico): string {
  const dados = {
    anuncio: {
      id: a.item_id,
      titulo: a.titulo,
      categoria: a.categoria,
      condicao: a.condicao,
      preco: a.preco,
      tipo_anuncio: a.tipo_anuncio,
      catalogo: a.catalogo,
      variacoes: a.variacoes.slice(0, 20),
      atributos: d.ficha.preenchidos.slice(0, 80),
      descricao_atual: (a.descricao ?? "").slice(0, 3000),
      fotos: d.fotos,
    },
    limites: { titulo_max: d.titulo.max, descricao_max: d.descricao.max },
    qualidade_ml: d.qualidade ? { nota: d.qualidade.score, nivel: d.qualidade.nivel, pendencias: d.qualidade.pendencias.map((p) => p.titulo) } : null,
    achados_das_regras: d.achados.map((x) => ({ frente: x.frente, gravidade: x.gravidade, texto: x.texto })),
  };
  return `Você é consultor sênior de anúncios do Mercado Livre Brasil.
Analise o anúncio abaixo e sugira melhorias. Você só sugere: nada é alterado no Mercado Livre.

Regras:
- Use só os dados informados. Não invente marca, modelo, medidas, materiais, compatibilidades, garantia nem números.
- "recomendacoes": de 3 a 8, ordenadas por prioridade.
  · origem "regra": explica um item de "achados_das_regras" e diz o próximo passo. Cubra todos os achados de gravidade alta.
  · origem "ia": sua análise livre do anúncio inteiro (clareza, ordem das informações, o que o comprador procura), sempre apoiada nos dados acima.
  · cite o dado que motivou cada sugestão. Campo null ou vazio = sem dado; não conclua nada sobre ele.
- "titulos_sugeridos": de 2 a 3 títulos. Cada um com no máximo ${d.titulo.max ?? 60} caracteres, formato produto + marca + modelo + características principais,
  usando só palavras e atributos presentes nos dados. Sem preço, frete, promoção, estoque, emojis ou tudo em maiúsculas.
- "descricao_sugerida": texto simples (sem HTML, links, telefone ou e-mail), em parágrafos curtos e tópicos com "- ",
  baseado só nos atributos e na descrição atual. Se não houver dados suficientes, devolva "".
- "resumo": 2 frases com a leitura geral do anúncio.
- Português do Brasil, frases curtas.

Dados: ${JSON.stringify(dados)}`;
}

export type RespostaIa = {
  resumo: string;
  recomendacoes: { frente: string; prioridade: Gravidade; origem: "regra" | "ia"; titulo: string; texto: string }[];
  titulos_sugeridos: string[];
  descricao_sugerida: string | null;
};

/** Garante limites e formato: títulos acima do máximo da categoria são descartados, não cortados. */
export function validarIa(json: unknown, maxTitulo: number | null, maxDescricao: number | null): RespostaIa | null {
  if (!json || typeof json !== "object") return null;
  const r = json as Record<string, unknown>;
  const resumo = txt(r.resumo);
  if (!resumo) return null;
  const recs = (Array.isArray(r.recomendacoes) ? r.recomendacoes : []).flatMap((x) => {
    const o = x as Record<string, unknown>;
    const titulo = txt(o.titulo), texto = txt(o.texto);
    const prioridade = o.prioridade === "alta" || o.prioridade === "media" || o.prioridade === "baixa" ? o.prioridade : null;
    const origem = o.origem === "regra" || o.origem === "ia" ? o.origem : null;
    if (!titulo || !texto || !prioridade || !origem) return [];
    return [{ frente: txt(o.frente) ?? "geral", prioridade, origem, titulo, texto }];
  });
  const vistos = new Set<string>();
  const titulos = (Array.isArray(r.titulos_sugeridos) ? r.titulos_sugeridos : [])
    .map((t) => (typeof t === "string" ? t.replace(/\s+/g, " ").trim() : ""))
    .filter((t) => t && (maxTitulo == null || t.length <= maxTitulo) && !vistos.has(t.toLowerCase()) && vistos.add(t.toLowerCase()))
    .slice(0, 3);
  let descricao = txt(r.descricao_sugerida);
  if (descricao && maxDescricao != null && descricao.length > maxDescricao) descricao = null;
  return { resumo, recomendacoes: recs.slice(0, 8), titulos_sugeridos: titulos, descricao_sugerida: descricao };
}

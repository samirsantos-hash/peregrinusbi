// Remove dados pessoais e contatos de textos livres antes de enviá-los à IA.
// Sem imports: usado nas funções e nos testes.

const REGRAS: Array<[RegExp, string]> = [
  [/[\w.+-]+\s*(?:@|\(at\)|\[at\])\s*[\w-]+(?:\s*(?:\.|\(dot\)|\[dot\])\s*[\w-]+)+/gi, "[e-mail removido]"],
  [/\b(?:https?:\/\/|www\.)\S+|\b(?:wa\.me|bit\.ly|t\.me|instagram\.com|facebook\.com)\/\S*/gi, "[link removido]"],
  [/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[documento removido]"],
  [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[documento removido]"],
  [/(?:\+?55[\s-]?)?\(?\b\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}\b/g, "[telefone removido]"],
  [/\b\d{5}-\d{3}\b/g, "[CEP removido]"],
  [/(^|\s)@[a-z0-9_.]{3,}/gi, "$1[usuário removido]"],
];

export function limparDadosPessoais(texto: string): string {
  let t = String(texto ?? "");
  for (const [re, troca] of REGRAS) t = t.replace(re, troca);
  return t;
}

/** Verdadeiro quando o texto contém contato, link ou documento. */
export function contemDadosPessoais(texto: string): boolean {
  return limparDadosPessoais(texto) !== String(texto ?? "");
}

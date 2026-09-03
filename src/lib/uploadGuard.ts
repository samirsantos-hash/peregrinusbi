/**
 * Validação de arquivo antes de qualquer parse.
 *
 * O atributo `accept` do input é só uma sugestão do navegador — arrastar e
 * soltar ou trocar o filtro burla. Aqui a checagem é explícita e falha alto:
 * arquivo fora do esperado é rejeitado com mensagem clara, nunca aceito
 * "na dúvida".
 */
export const MAX_UPLOAD_MB = 60;

const MIMES_PERMITIDOS = [
  "text/csv",
  "text/plain",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
  "", // navegadores frequentemente não informam MIME para .csv
];

export interface RegraUpload {
  /** Extensões aceitas, com ponto e em minúsculas. Ex.: [".csv", ".xlsx"] */
  extensoes: string[];
  maxMb?: number;
}

/** Lança erro descritivo quando o arquivo não atende à regra. */
export function validarArquivoUpload(file: File, regra: RegraUpload): void {
  const nome = file.name.toLowerCase();
  const ext = nome.slice(nome.lastIndexOf("."));

  if (!regra.extensoes.includes(ext)) {
    throw new Error(
      `Arquivo "${file.name}" não é aceito aqui. Envie um arquivo ${regra.extensoes.join(" ou ")}.`,
    );
  }

  if (!MIMES_PERMITIDOS.includes(file.type)) {
    throw new Error(
      `O tipo do arquivo "${file.name}" (${file.type}) não corresponde a uma planilha ou CSV válido.`,
    );
  }

  const limite = regra.maxMb ?? MAX_UPLOAD_MB;
  if (file.size > limite * 1024 * 1024) {
    throw new Error(
      `Arquivo "${file.name}" tem ${(file.size / 1024 / 1024).toFixed(1)} MB e excede o limite de ${limite} MB.`,
    );
  }

  if (file.size === 0) {
    throw new Error(`Arquivo "${file.name}" está vazio.`);
  }
}

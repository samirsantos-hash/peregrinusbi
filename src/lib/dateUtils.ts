export function tempoDesdeUltimoAcesso(ultimo: string | Date | null): string {
  if (!ultimo) return "nunca";
  const diff = Date.now() - new Date(ultimo).getTime();
  if (diff < 60_000) return "agora";
  const totalHoras = Math.floor(diff / 3_600_000);
  const dias = Math.floor(totalHoras / 24);
  const horas = totalHoras % 24;
  return `${dias}d ${horas}h`;
}

export function formatarDuracao(segundos: number | null): string {
  if (!segundos || segundos <= 0) return "0h";
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  if (horas === 0) return `${minutos}min`;
  return `${horas}h ${minutos}min`;
}

export function maskToken(token: string): string {
  if (token.length <= 10) return token;
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}
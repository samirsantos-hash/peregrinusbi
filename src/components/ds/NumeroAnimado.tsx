import { useNumeroAnimado } from "@/hooks/useNumeroAnimado";

export function NumeroAnimado({ valor, duracao, atraso }: { valor: string; duracao?: number; atraso?: number }) {
  const texto = useNumeroAnimado(valor, duracao, atraso);
  return <span className="tabular-nums" data-contando aria-label={valor}>{texto}</span>;
}

export default NumeroAnimado;
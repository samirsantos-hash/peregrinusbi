import { useNumeroAnimado } from "@/hooks/useNumeroAnimado";

export function NumeroAnimado({ valor, duracao }: { valor: string; duracao?: number }) {
  const texto = useNumeroAnimado(valor, duracao);
  return <span className="tabular-nums" data-contando aria-label={valor}>{texto}</span>;
}

export default NumeroAnimado;
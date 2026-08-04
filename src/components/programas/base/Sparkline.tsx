interface Props {
  pontos: { periodo: string; valor: number | null }[];
  largura?: number;
  altura?: number;
}

/** Não conecta pontos por cima de períodos sem dado: quebra a linha. */
const Sparkline = ({ pontos, largura = 72, altura = 20 }: Props) => {
  const validos = pontos.filter((p) => p.valor !== null);
  if (validos.length < 2) return <span className="text-muted-foreground text-xs">—</span>;

  const vals = validos.map((p) => p.valor as number);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const dx = pontos.length > 1 ? largura / (pontos.length - 1) : largura;

  const segmentos: string[] = [];
  let atual: string[] = [];
  pontos.forEach((p, i) => {
    if (p.valor === null) {
      if (atual.length > 1) segmentos.push(atual.join(" "));
      atual = [];
      return;
    }
    const x = i * dx;
    const y = altura - ((p.valor - min) / span) * (altura - 2) - 1;
    atual.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  if (atual.length > 1) segmentos.push(atual.join(" "));

  return (
    <svg width={largura} height={altura} className="overflow-visible" aria-hidden>
      {segmentos.map((s, i) => (
        <polyline key={i} points={s} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} />
      ))}
    </svg>
  );
};

export default Sparkline;

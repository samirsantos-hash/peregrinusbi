import type { Alavanca, Parceiro } from "@/types/programas";

interface Props {
  parceiros: Parceiro[];
  alavancas: Alavanca[];
}

const TabelaEcossistema = ({ parceiros, alavancas }: Props) => (
  <section className="glass-card p-4">
    <h2 className="metric-label mb-3">Ecossistema de parceiros</h2>
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
            <th className="py-2 pr-3 font-medium">Parceiro</th>
            <th className="py-2 pr-3 font-medium">Papel</th>
            <th className="py-2 pr-3 font-medium">Alavancas sob responsabilidade</th>
            <th className="py-2 pr-3 font-medium">Contato</th>
            <th className="py-2 font-medium">Última interação</th>
          </tr>
        </thead>
        <tbody>
          {parceiros.map((p) => {
            const suas = alavancas.filter((a) => a.parceiroResponsavelId === p.id);
            return (
              <tr key={p.id} className="border-b border-border/50">
                <td className="py-2 pr-3 font-medium text-foreground">{p.nome}</td>
                <td className="py-2 pr-3 text-muted-foreground">{p.papel}</td>
                <td className="py-2 pr-3">
                  {suas.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {suas.map((a) => (
                        <span key={a.id} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                          {a.nome}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 text-muted-foreground">{p.contato ?? "—"}</td>
                <td className="py-2 text-muted-foreground font-mono tabular-nums">
                  {p.ultimaInteracao ? new Date(p.ultimaInteracao).toLocaleDateString("pt-BR") : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </section>
);

export default TabelaEcossistema;

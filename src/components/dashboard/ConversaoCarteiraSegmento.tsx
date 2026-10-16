import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";

const NOMES: Record<string, string> = {
  "VEHICLE PARTS & ACCESSORIES": "Autopeças", "CONSTRUCTION & INDUSTRY": "Construção e Indústria",
  "FURNISHING & HOUSEWARE": "Casa e Móveis", FASHION: "Moda", CPG: "Mercado", TECHNOLOGY: "Tecnologia",
  BEAUTY: "Beleza", "HOME ELECTRONICS": "Eletrodomésticos", HEALTH: "Saúde", ENTERTAINMENT: "Entretenimento",
  "T & B": "Bebês e Brinquedos", SPORTS: "Esportes", OTHERS: "Outros",
};
const nome = (v: string) => NOMES[v] ?? v.charAt(0) + v.slice(1).toLowerCase();
const pct = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

interface Linha { segmento: string; conv: number; lojas: number }

function useConversaoSegmento() {
  return useQuery({
    queryKey: ["conversao-carteira-segmento"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const hoje = new Date();
      const mesAtual = hoje.getFullYear() * 100 + hoje.getMonth() + 1;
      const { data: ult } = await supabase.from("sellers_kpi").select("tim_month_id")
        .lt("tim_month_id", mesAtual).order("tim_month_id", { ascending: false }).limit(1);
      const mes = ult?.[0]?.tim_month_id;
      if (!mes) return { mes: null, linhas: [] as Linha[] };
      const [kpi, sel] = await Promise.all([
        fetchAllRows<{ seller_id: string; tsi: number | null; visits: number | null }>((a, b) =>
          supabase.from("sellers_kpi").select("seller_id, tsi, visits").eq("tim_month_id", mes).order("seller_id").range(a, b)),
        fetchAllRows<{ id: string; vertical_dominant: string | null }>((a, b) =>
          supabase.from("sellers").select("id, vertical_dominant").order("id").range(a, b)),
      ]);
      const vert = new Map(sel.data.map((s) => [s.id, s.vertical_dominant]));
      const agg = new Map<string, { tsi: number; vis: number; lojas: number }>();
      for (const r of kpi.data) {
        const v = vert.get(r.seller_id);
        const vis = Number(r.visits) || 0;
        if (!v || vis <= 0) continue;
        const g = agg.get(v) ?? { tsi: 0, vis: 0, lojas: 0 };
        g.tsi += Number(r.tsi) || 0; g.vis += vis; g.lojas++;
        agg.set(v, g);
      }
      // Média ponderada (vendas ÷ visitas do segmento); segmentos com < 3 lojas ficam de fora.
      const linhas = [...agg.entries()].filter(([, g]) => g.lojas >= 3)
        .map(([v, g]) => ({ segmento: nome(v), conv: (g.tsi / g.vis) * 100, lojas: g.lojas }))
        .sort((a, b) => b.conv - a.conv);
      return { mes, linhas };
    },
  });
}

export default function ConversaoCarteiraSegmento() {
  const { data, isLoading } = useConversaoSegmento();
  const mesTxt = data?.mes ? `${MESES[(data.mes % 100) - 1]}/${Math.floor(data.mes / 100)}` : "";
  const media = data?.linhas.length ? data.linhas.reduce((s, l) => s + l.conv, 0) / data.linhas.length : 0;

  return (
    <section className="my-4 space-y-3 rounded-xl border border-border/50 bg-card/40 p-5">
      <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          A taxa de conversão muda muito de um segmento para outro: produtos de compra rápida convertem mais que móveis ou
          tecnologia. Compare a loja com o próprio segmento, não com a carteira toda. Valores de {mesTxt || "último mês fechado"},
          calculados como vendas ÷ visitas de todas as lojas do segmento.
        </p>
      </div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
        Taxa de conversão média da carteira por segmento
      </h3>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando…</p>
      ) : !data?.linhas.length ? (
        <p className="text-xs text-muted-foreground">Sem dado de conversão por segmento.</p>
      ) : (
        <div style={{ height: Math.max(180, data.linhas.length * 34) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.linhas} layout="vertical" margin={{ left: 8, right: 56 }}>
              <CartesianGrid horizontal={false} stroke="hsl(var(--grid))" />
              <XAxis type="number" tick={{ fill: "hsl(var(--axis))", fontSize: 11 }} axisLine={false}
                tickFormatter={(v) => `${v.toLocaleString("pt-BR")}%`} />
              <YAxis type="category" dataKey="segmento" width={170} tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const l = payload[0].payload as Linha;
                  return (
                    <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-lg">
                      <p className="font-semibold">{l.segmento}</p>
                      <p>Conversão: {pct(l.conv)}</p>
                      <p className="text-muted-foreground">{l.lojas} lojas</p>
                    </div>
                  );
                }} />
              <Bar dataKey="conv" radius={[0, 6, 6, 0]}>
                {data.linhas.map((l) => (
                  <Cell key={l.segmento} fill={l.conv >= media ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.45)"} />
                ))}
                <LabelList dataKey="conv" position="right" formatter={(v: number) => pct(v)}
                  style={{ fill: "hsl(var(--foreground))", fontSize: 11 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

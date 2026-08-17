import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MapPin, Search, Users, ArrowUpRight } from "lucide-react";
import { useGmConcessionarias } from "@/hooks/useGmConcessionarias";
import TooltipInfo from "@/components/dashboard/TooltipInfo";
import type { SellerWithKpi } from "@/hooks/usePortfolios";

interface Props {
  /** cust_ids da carteira em exibição — o cadastro é filtrado por eles. */
  custIds: string[];
  /** Sellers da carteira com KPIs, usados no ranking por impacto. */
  sellers?: SellerWithKpi[];
}

type DivFilter = "todas" | "Norte" | "Sul";
type Metrica = "gmv" | "roas" | "score";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const METRICA_INFO: Record<Metrica, { label: string; tip: string }> = {
  gmv: {
    label: "GMV",
    tip: "GMV (TGMV_LC) do período: faturamento total da loja.\nOrdena da maior para a menor receita — mostra onde está o peso financeiro da divisão.",
  },
  roas: {
    label: "ROAS",
    tip: "ROAS = GMV de Ads (TGMV_LC_PADS) ÷ Investimento em Ads (INV_PADS).\nCalculado por loja sobre os totais do período. Lojas sem investimento aparecem como “—”.",
  },
  score: {
    label: "Score",
    tip: "Score de qualidade final (0–100): média consolidada de foto, título, oferta e características do catálogo.",
  },
};

export default function GmCadastroPanel({ custIds, sellers = [] }: Props) {
  const { rows, loading } = useGmConcessionarias();
  const [busca, setBusca] = useState("");
  const [divisao, setDivisao] = useState<DivFilter>("todas");
  const [drill, setDrill] = useState<"Norte" | "Sul" | null>(null);
  const [metrica, setMetrica] = useState<Metrica>("gmv");

  const doCarteira = useMemo(() => {
    const set = new Set(custIds.map(String));
    return rows.filter((r) => set.has(r.custId));
  }, [rows, custIds]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return doCarteira.filter((r) => {
      if (divisao !== "todas" && r.divisao !== divisao) return false;
      if (!q) return true;
      return [r.nome, r.custId, r.responsavel, r.cidade, r.uf]
        .some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [doCarteira, busca, divisao]);

  const totais = useMemo(() => ({
    norte: doCarteira.filter((r) => r.divisao === "Norte").length,
    sul: doCarteira.filter((r) => r.divisao === "Sul").length,
    ativas: doCarteira.filter((r) => r.status.toLowerCase() === "ativa").length,
  }), [doCarteira]);

  /** Sellers da divisão selecionada, com métricas calculadas e ordenados por impacto. */
  const ranking = useMemo(() => {
    if (!drill) return [];
    const daDivisao = new Map(
      doCarteira.filter((r) => r.divisao === drill).map((r) => [r.custId, r])
    );
    const linhas = sellers
      .filter((s) => daDivisao.has(String(s.custId)))
      .map((s) => {
        const cad = daDivisao.get(String(s.custId))!;
        return {
          custId: String(s.custId),
          nome: cad.nome,
          nickname: s.nickname,
          responsavel: cad.responsavel,
          praca: [cad.cidade, cad.uf].filter(Boolean).join(" · "),
          gmv: s.tgmvLc || 0,
          invPads: s.invPads || 0,
          roas: s.invPads > 0 ? (s.tgmvLcPads || 0) / s.invPads : null,
          score: s.scoreQualidadeFinal || 0,
        };
      });
    return linhas.sort((a, b) => {
      if (metrica === "gmv") return b.gmv - a.gmv;
      if (metrica === "score") return b.score - a.score;
      return (b.roas ?? -1) - (a.roas ?? -1);
    });
  }, [drill, doCarteira, sellers, metrica]);

  const totalGmvDivisao = useMemo(
    () => ranking.reduce((acc, r) => acc + r.gmv, 0),
    [ranking]
  );

  if (loading || doCarteira.length === 0) return null;

  return (
    <>
    <Card className="border-border">
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">Cadastro de concessionárias GM</h3>
            <span className="text-xs text-muted-foreground">
              {doCarteira.length} loja(s) · {totais.ativas} ativa(s)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["todas", "Norte", "Sul"] as DivFilter[]).map((d) => (
              <Button
                key={d}
                size="sm"
                variant={divisao === d ? "default" : "outline"}
                onClick={() => setDivisao(d)}
                className="h-7 text-xs"
              >
                {d === "todas" ? `Todas (${doCarteira.length})` : `Divisão ${d} (${d === "Norte" ? totais.norte : totais.sul})`}
              </Button>
            ))}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar loja, CUST ID, responsável…"
                className="h-7 pl-7 text-xs w-56"
              />
            </div>
          </div>
        </div>

        {/* Resumos por divisão — clicáveis */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["Norte", "Sul"] as const).map((d) => {
            const qtd = d === "Norte" ? totais.norte : totais.sul;
            if (qtd === 0) return null;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDrill(d)}
                className="group text-left rounded-md border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-colors p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Divisão {d}
                    <TooltipInfo text={`Clique para abrir o ranking de lojas da Divisão ${d} ordenado por impacto (GMV, ROAS ou Score de qualidade).`} />
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-lg font-bold mt-1">{qtd} loja(s)</p>
                <p className="text-[11px] text-muted-foreground">Ver ranking por impacto</p>
              </button>
            );
          })}
        </div>

        <div className="max-h-[420px] overflow-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Concessionária</TableHead>
                <TableHead className="text-xs">CUST ID</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Responsável</TableHead>
                <TableHead className="text-xs">Praça</TableHead>
                <TableHead className="text-xs">Divisão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((r) => (
                <TableRow key={r.nome}>
                  <TableCell className="text-xs font-medium">{r.nome}</TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">{r.custId}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        r.status.toLowerCase() === "ativa"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]"
                          : "bg-muted/30 text-muted-foreground border-border text-[10px]"
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{r.responsavel || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {[r.cidade, r.uf].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        r.divisao === "Norte"
                          ? "bg-sky-500/15 text-sky-400 border-sky-500/30 text-[10px]"
                          : "bg-primary/15 text-primary border-primary/30 text-[10px]"
                      }
                    >
                      {r.divisao}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filtradas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-xs text-center text-muted-foreground py-6">
                    Nenhuma concessionária encontrada com os filtros atuais.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <Dialog open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            Divisão {drill} · lojas por impacto
          </DialogTitle>
          <DialogDescription className="text-xs">
            {ranking.length} loja(s) com dados de KPI · GMV total {fmtBRL(totalGmvDivisao)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Ordenar por:</span>
          {(Object.keys(METRICA_INFO) as Metrica[]).map((m) => (
            <Button
              key={m}
              size="sm"
              variant={metrica === m ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => setMetrica(m)}
            >
              {METRICA_INFO[m].label}
            </Button>
          ))}
          <TooltipInfo text={METRICA_INFO[metrica].tip} />
        </div>

        <div className="max-h-[440px] overflow-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-8">#</TableHead>
                <TableHead className="text-xs">Loja</TableHead>
                <TableHead className="text-xs text-right">
                  GMV<TooltipInfo text={METRICA_INFO.gmv.tip} />
                </TableHead>
                <TableHead className="text-xs text-right">
                  ROAS<TooltipInfo text={METRICA_INFO.roas.tip} />
                </TableHead>
                <TableHead className="text-xs text-right">
                  Score<TooltipInfo text={METRICA_INFO.score.tip} />
                </TableHead>
                <TableHead className="text-xs text-right">
                  Share
                  <TooltipInfo text="Participação da loja no GMV total da divisão (GMV da loja ÷ GMV somado das lojas listadas)." />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((r, i) => (
                <TableRow key={r.custId}>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="text-xs">
                    <div className="font-medium">{r.nome}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {r.custId}{r.praca ? ` · ${r.praca}` : ""}{r.responsavel ? ` · ${r.responsavel}` : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{fmtBRL(r.gmv)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">
                    {r.roas === null ? "—" : `${r.roas.toFixed(1)}x`}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{r.score.toFixed(0)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                    {totalGmvDivisao > 0 ? `${((r.gmv / totalGmvDivisao) * 100).toFixed(1)}%` : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {ranking.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-xs text-center text-muted-foreground py-6">
                    Nenhuma loja desta divisão possui KPIs no período selecionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

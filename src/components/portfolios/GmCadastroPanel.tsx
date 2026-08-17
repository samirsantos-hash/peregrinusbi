import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Search, Users } from "lucide-react";
import { useGmConcessionarias } from "@/hooks/useGmConcessionarias";

interface Props {
  /** cust_ids da carteira em exibição — o cadastro é filtrado por eles. */
  custIds: string[];
}

type DivFilter = "todas" | "Norte" | "Sul";

export default function GmCadastroPanel({ custIds }: Props) {
  const { rows, loading } = useGmConcessionarias();
  const [busca, setBusca] = useState("");
  const [divisao, setDivisao] = useState<DivFilter>("todas");

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

  if (loading || doCarteira.length === 0) return null;

  return (
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
  );
}

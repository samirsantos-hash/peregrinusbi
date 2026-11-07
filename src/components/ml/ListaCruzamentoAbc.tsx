import { FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { podeExportar } from '@/lib/permissaoExportar';
import { brl, num } from '@/lib/format';
import type { cruzarAbc } from '@/lib/anuncio/curvaAbc';

type Item = ReturnType<typeof cruzarAbc>[number];
export type Grupo = { faturamento: 'A' | 'B' | 'C'; unidades: 'A' | 'B' | 'C' };

// Evita que texto vindo do anúncio vire fórmula ao abrir no Excel.
const seguro = (v: string) => /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export default function ListaCruzamentoAbc({ grupo, itens, periodo, onClose }: { grupo: Grupo | null; itens: Item[]; periodo: string; onClose: () => void }) {
  const lista = grupo ? itens.filter(i => i.classeFaturamento === grupo.faturamento && i.classeUnidades === grupo.unidades).sort((a, b) => b.faturamentoCents - a.faturamentoCents) : [];
  const titulo = grupo ? `Receita ${grupo.faturamento} · Unidades ${grupo.unidades}` : '';
  const linhas = () => lista.map(i => ({ Anúncio: i.mlb, Título: seguro(i.titulo), 'Faturamento (R$)': i.faturamentoCents / 100, Unidades: i.unidades, Pedidos: i.pedidos, 'Classe faturamento': i.classeFaturamento ?? '', 'Classe unidades': i.classeUnidades ?? '', Perfil: i.perfil }));
  const nome = `curva-abc-receita-${grupo?.faturamento}-unidades-${grupo?.unidades}`;

  async function excel() {
    if (!(await podeExportar())) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas()), 'Anúncios');
    baixar(new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${nome}.xlsx`);
  }
  async function txt() {
    if (!(await podeExportar())) return;
    const l = linhas(), cab = Object.keys(l[0] ?? { Anúncio: '' });
    const corpo = [cab.join('\t'), ...l.map(r => cab.map(c => String((r as Record<string, unknown>)[c]).replace(/[\t\r\n]+/g, ' ')).join('\t'))].join('\r\n');
    baixar(new Blob([`${titulo} · ${periodo}\r\n${corpo}`], { type: 'text/plain;charset=utf-8' }), `${nome}.txt`);
  }

  return <Sheet open={!!grupo} onOpenChange={o => { if (!o) onClose(); }}>
    <SheetContent side="right" className="!left-auto !right-0 !w-[min(88vw,480px)] !max-w-[min(88vw,480px)] flex flex-col overflow-hidden">
      <SheetHeader className="shrink-0 pr-6 text-left"><SheetTitle>{titulo}</SheetTitle><SheetDescription>{num(lista.length)} anúncios · {periodo}</SheetDescription></SheetHeader>
      <div className="flex shrink-0 gap-2 my-4">
        <Button variant="outline" size="sm" disabled={!lista.length} onClick={() => void excel()}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
        <Button variant="outline" size="sm" disabled={!lista.length} onClick={() => void txt()}><FileText className="h-4 w-4 mr-1" />TXT</Button>
      </div>
      {lista.length ? <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-3 pr-2 text-xs">{lista.map(i => <li key={i.mlb} className="border-b border-border/50 pb-3">
        <p className="font-medium break-words">{i.titulo}</p>
        <p className="break-words text-muted-foreground tabular-nums">{i.mlb} · {brl(i.faturamentoCents / 100)} · {num(i.unidades)} unidades · {num(i.pedidos)} pedidos · {i.perfil}</p>
      </li>)}</ul> : <p className="text-sm text-muted-foreground">Nenhum anúncio nesta combinação no período.</p>}
    </SheetContent>
  </Sheet>;
}

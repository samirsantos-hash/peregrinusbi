import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type Filtros = {
  lojas: string[];
  ini: string; fim: string;
  uf: string; logi: string; tipo: string;
  origem: "todos" | "ads" | "organico";
  cancelados: boolean;
};

interface Props {
  filtros: Filtros;
  set: (f: Partial<Filtros>) => void;
  opcoes: { lojas: string[]; ufs: string[]; logis: string[]; tipos: string[]; ini: string; fim: string };
}

const Select = ({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="h-8 rounded-md border border-border/60 bg-card/60 px-2 text-xs text-foreground"
  >
    <option value="">{placeholder}</option>
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

const shift = (fim: string, dias: number) => {
  const t = Date.parse(`${fim}T00:00:00Z`) - (dias - 1) * 86400000;
  return new Date(t).toISOString().slice(0, 10);
};

const FiltersBar = ({ filtros, set, opcoes }: Props) => {
  const toggleLoja = (l: string) =>
    set({ lojas: filtros.lojas.includes(l) ? filtros.lojas.filter((x) => x !== l) : [...filtros.lojas, l] });

  return (
    <div className="sticky top-0 z-20 border-b border-border/40 bg-background/95 backdrop-blur px-3 py-2 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground mr-1">
          Lojas{" "}
          <span className="text-foreground/70">
            ({filtros.lojas.length || opcoes.lojas.length}/{opcoes.lojas.length})
          </span>
        </span>
        <button
          onClick={() => set({ lojas: [] })}
          className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
            filtros.lojas.length === 0
              ? "bg-primary/15 border-primary/60 text-primary"
              : "border-border/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          rede inteira
        </button>
        {opcoes.lojas.map((l) => {
          const on = filtros.lojas.includes(l);
          return (
            <button
              key={l}
              onClick={() => toggleLoja(l)}
              className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                on ? "bg-primary/15 border-primary/60 text-primary" : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {l}
            </button>
          );
        })}
        {filtros.lojas.length > 0 && filtros.lojas.length < opcoes.lojas.length && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]"
            onClick={() => set({ lojas: opcoes.lojas })}>selecionar todas</Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" value={filtros.ini} onChange={(e) => set({ ini: e.target.value })} className="h-8 w-[140px] text-xs" />
        <Input type="date" value={filtros.fim} onChange={(e) => set({ fim: e.target.value })} className="h-8 w-[140px] text-xs" />
        {[7, 15, 30, 60, 90].map((d) => (
          <Button key={d} variant="outline" size="sm" className="h-8 px-2 text-[11px]"
            onClick={() => set({ ini: shift(opcoes.fim, d), fim: opcoes.fim })}>
            {d}d
          </Button>
        ))}
        <Button variant="outline" size="sm" className="h-8 px-2 text-[11px]"
          onClick={() => set({ ini: `${opcoes.fim.slice(0, 7)}-01`, fim: opcoes.fim })}>
          mês do arquivo
        </Button>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-[11px]"
          onClick={() => set({ ini: opcoes.ini, fim: opcoes.fim })}>
          tudo
        </Button>

        <Select value={filtros.uf} onChange={(v) => set({ uf: v })} options={opcoes.ufs} placeholder="UF" />
        <Select value={filtros.logi} onChange={(v) => set({ logi: v })} options={opcoes.logis} placeholder="Modal logístico" />
        <Select value={filtros.tipo} onChange={(v) => set({ tipo: v })} options={opcoes.tipos} placeholder="Tipo de anúncio" />
        <Select
          value={filtros.origem === "todos" ? "" : filtros.origem}
          onChange={(v) => set({ origem: (v || "todos") as Filtros["origem"] })}
          options={["ads", "organico"]}
          placeholder="Pago + orgânico"
        />
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <input type="checkbox" checked={filtros.cancelados} onChange={(e) => set({ cancelados: e.target.checked })} />
          incluir cancelados
        </label>
      </div>
    </div>
  );
};

export default FiltersBar;
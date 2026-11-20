import { useState } from 'react';
import { Check, ChevronsUpDown, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import type { ContaMl } from '@/lib/mlFuncoes';

/** Receives only the server-authorized accounts; searching never adds accounts. */
export default function BuscarLojaMl({ contas, value, onChange }: { contas: ContaMl[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = contas.find(c => c.id === value);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button variant="outline" role="combobox" aria-label="Buscar loja" aria-expanded={open} className="h-auto min-h-11 w-full sm:w-[340px] max-w-full justify-between gap-2 py-2">
        <Store className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1 min-w-0 text-left"><span className="block truncate">{selected?.nickname || (selected ? String(selected.ml_user_id) : 'Buscar loja')}</span>{selected && <span className="block text-xs text-muted-foreground font-normal">ID {selected.ml_user_id} · {selected.site_id}</span>}</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-[340px] max-w-[calc(100vw-24px)] p-0">
      <Command filter={(value, search) => {
        const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s/g, '');
        return normalize(value).includes(normalize(search)) ? 1 : 0;
      }}>
        <CommandInput placeholder="Buscar loja por nome ou ID..." />
        <CommandList><CommandEmpty>Nenhuma loja encontrada.</CommandEmpty><CommandGroup heading={`${contas.length} lojas disponíveis`}>
          {contas.map(c => <CommandItem key={c.id} value={`${c.nickname ?? ''} ${c.ml_user_id} ${c.site_id}`} onSelect={() => { onChange(c.id); setOpen(false); }} className="gap-2 py-3">
            <Check className={`h-4 w-4 shrink-0 ${c.id === value ? 'text-primary' : 'opacity-0'}`} />
            <span className="min-w-0"><span className="block break-words font-medium">{c.nickname ?? c.ml_user_id}</span><span className="text-xs text-muted-foreground">ID {c.ml_user_id} · {c.site_id}</span></span>
          </CommandItem>)}
        </CommandGroup></CommandList>
      </Command>
    </PopoverContent>
  </Popover>;
}
import { ArrowRight } from 'lucide-react';
import { num, pctFracao } from '@/lib/format';

export default function FunilResumoReal({ visitas, vendas, unidade = 'Pedidos pagos' }: { visitas: number | null; vendas: number; unidade?: string }) {
  return <section aria-label="Funil de conversão" className="space-y-4">
    <h3 className="text-base font-semibold">Funil de conversão</h3>
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
      {[
        { nome: 'Visitas', valor: visitas, nota: 'Aberturas dos anúncios' },
        { nome: 'Visualização', valor: visitas, nota: 'Mesma medição de visitas' },
        { nome: 'Carrinho', valor: null, nota: 'Não disponibilizado pela fonte' },
        { nome: 'Checkout', valor: null, nota: 'Não disponibilizado pela fonte' },
        { nome: unidade, valor: vendas, nota: unidade === 'Pedidos pagos' ? 'Pagamentos confirmados' : 'Unidades, não pedidos' },
      ].map((e, i) => <div key={e.nome} className="ds-glass-surface rounded-2xl p-5 min-w-0">
        <div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{e.nome}</p>{i < 4 && <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />}</div>
        <p className="text-xl font-semibold tabular-nums mt-2 break-words">{e.valor == null ? 'Sem dado' : num(e.valor)}</p>
        <p className="text-xs text-muted-foreground mt-2">{e.nota}</p>
      </div>)}
    </div>
    <p className="text-sm text-muted-foreground">{unidade === 'Pedidos pagos' ? 'Pedidos pagos ÷ visitas' : 'Unidades ÷ visitas'}: <span className="font-semibold text-foreground tabular-nums">{pctFracao(visitas && visitas > 0 ? vendas / visitas : null, 2)}</span> · Abandono por etapa: sem dado.</p>
  </section>;
}
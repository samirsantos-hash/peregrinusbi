import { motion } from "framer-motion";
import { Activity, Info } from "lucide-react";
import TooltipInfo from "./TooltipInfo";

/**
 * Taxa de Conversão por MLB (anúncio individual).
 *
 * Fórmula prevista: tsi / NULLIF(visitas, 0) * 100 por item_id.
 *
 * FONTE NECESSÁRIA: tabela seller_listings_quality com colunas
 * `visitas`, `tsi` e `gmv` no nível de item — que NÃO existem hoje no schema
 * (a tabela só tem scores de qualidade e métricas específicas de Clips).
 *
 * O CSV diarizado atual é agregado por seller, não por item. Para habilitar
 * este painel, é necessário ingerir um arquivo separado de performance por MLB.
 * Enquanto isso, o painel exibe um estado vazio claro.
 */
export default function ConversaoPorMLBPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-neon-blue" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Taxa de Conversão por Anúncio
        </h3>
        <TooltipInfo text="Conversão calculada por MLB individual: pedidos do anúncio dividido pelas visitas do anúncio. Permite identificar quais produtos convertem acima ou abaixo da média da loja." />
      </div>

      <div className="flex items-start gap-3 p-4 rounded-md border border-border/60 bg-muted/10">
        <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-xs space-y-1.5">
          <p className="font-semibold text-foreground">
            Dados de conversão por anúncio ainda não disponíveis.
          </p>
          <p className="text-muted-foreground">
            A taxa de conversão por MLB requer visitas e pedidos no nível de item. O
            CSV diarizado atual é agregado por seller — para habilitar este painel é
            necessário um arquivo separado de performance por anúncio (com colunas
            <code className="mx-1 px-1 py-0.5 rounded bg-muted text-foreground">visitas</code>
            e
            <code className="mx-1 px-1 py-0.5 rounded bg-muted text-foreground">tsi</code>
            por <code className="px-1 py-0.5 rounded bg-muted text-foreground">item_id</code>).
          </p>
          <p className="text-muted-foreground">
            Solicite ao time de dados ML o arquivo de performance por item para popular
            <code className="mx-1 px-1 py-0.5 rounded bg-muted text-foreground">seller_listings_quality</code>
            com essas métricas.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
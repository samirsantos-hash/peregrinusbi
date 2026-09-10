import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Award, Clock, Layers, Tag, MapPin, Globe } from "lucide-react";
import TooltipInfo from "./TooltipInfo";
import { useClassificacaoLojas } from "@/hooks/useClassificacaoLojas";
import { UF_INFO } from "@/lib/geoBrasil";
import { supabase } from "@/integrations/supabase/client";

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

interface Props {
  seller?: { id?: string; custId?: string; cluster?: string; subCluster?: string; state?: string } | null;
  allKpis: { date?: string }[];
}

/** Complemento cadastral: busca o registro mais recente da loja em outras bases quando faltam cluster/UF. */
function useCadastroComplementar(custId?: string, precisa?: boolean) {
  return useQuery({
    queryKey: ["seller-cadastro-complementar", custId],
    enabled: Boolean(custId) && Boolean(precisa),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const id = String(custId);

      const cpp = await supabase
        .from("cpp_mensal")
        .select("cluster_seller, sub_cluster_seller, cus_state, tim_month_id")
        .eq("cust_id_text", id)
        .order("tim_month_id", { ascending: false })
        .limit(1)
        .maybeSingle();

      const gm = await supabase
        .from("gm_live_listings")
        .select("cluster_seller, sub_cluster_seller, cus_state, data")
        .eq("cust_id_text", id)
        .order("data", { ascending: false })
        .limit(1)
        .maybeSingle();

      const base = await supabase
        .from("cart_base_vendedores")
        .select("cus_state")
        .eq("cust_id", id)
        .limit(1)
        .maybeSingle();

      return {
        cluster: cpp.data?.cluster_seller || gm.data?.cluster_seller || "",
        subCluster: cpp.data?.sub_cluster_seller || gm.data?.sub_cluster_seller || "",
        state: cpp.data?.cus_state || gm.data?.cus_state || base.data?.cus_state || "",
      };
    },
  });
}

const SEM_CADASTRO = "Não informado na base";

const SellerInfoTable = ({ seller, allKpis }: Props) => {
  const { data: lojas } = useClassificacaoLojas();
  const faltando = !seller?.cluster || !seller?.subCluster || !seller?.state;
  const { data: extra } = useCadastroComplementar(seller?.custId, faltando);

  if (!seller) {
    return (
      <div className="glass-card p-3 text-[11px] text-muted-foreground">
        Selecione uma loja no topo da página para ver as informações cadastrais.
      </div>
    );
  }

  const subCluster = seller.subCluster || extra?.subCluster || "";
  // Quando a base não traz o cluster principal, a subclassificação é a única segmentação disponível.
  const cluster = seller.cluster || extra?.cluster || subCluster || "";
  const estado = seller.state || extra?.state || "";

  const dates = allKpis.map((k: any) => k.date).filter(Boolean).sort() as string[];

  let tempoPrograma = "—";
  if (dates.length >= 2) {
    const first = parseLocalDate(dates[0]);
    const last = parseLocalDate(dates[dates.length - 1]);
    const months = Math.max(1, Math.round((last.getTime() - first.getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
    tempoPrograma = `${months} ${months === 1 ? "mês" : "meses"}`;
  }

  const uf = (estado).trim().toUpperCase();
  const ufInfo = UF_INFO[uf];

  const loja = lojas?.find((l) => l.sellerId === seller.id);
  const tierLabels: Record<1 | 2 | 3, string> = {
    1: "Tier 1 · Platinum",
    2: "Tier 2 · Gold",
    3: "Tier 3 · Silver",
  };
  const fonteLabel: Record<string, string> = {
    reputacao: "reputação oficial",
    metricas: "métricas oficiais (SoW Pads, OOS, BS)",
    receita: "fallback por receita",
  };
  const tierValue = loja ? tierLabels[loja.tier] : "—";
  const tierTooltip = loja
    ? `Classificação Mercado Livre baseada em ${fonteLabel[loja.tierFonte]}. Critérios oficiais: T1 SoW Pads ≥2.5%, OOS ≤15%, BS ≤35%; T2 ≥1.25% / ≤25% / ≤45%; T3 ≥0.5% / ≤35% / ≤55%.`
    : "Tier oficial Mercado Livre (Platinum/Gold/Silver) — combina reputação e métricas SoW Pads, OOS e Bad Seller do último mês.";

  const rows = [
    {
      icon: Award,
      label: "Tier ML",
      value: tierValue,
      tooltip: tierTooltip,
    },
    {
      icon: Clock,
      label: "Tempo no Programa",
      value: tempoPrograma,
      tooltip: "Meses decorridos desde o primeiro registro de KPI do seller no programa Peregrinus.",
    },
    {
      icon: Layers,
      label: "Segmentação",
      value: cluster || SEM_CADASTRO,
      tooltip: cluster && !seller.cluster
        ? "Cluster estratégico do seller. A base não traz o cluster principal desta loja; exibimos a subclassificação disponível."
        : "Cluster estratégico do seller (Emerging, Core, Mature) — define as metas e benchmarks aplicados.",
    },
    {
      icon: Tag,
      label: "Sub Categoria",
      value: subCluster || SEM_CADASTRO,
      tooltip: "Subclassificação dentro do cluster principal — usada para comparações intra-vertical.",
    },
    {
      icon: MapPin,
      label: "Estado (UF)",
      value: uf ? `${uf}${ufInfo ? ` · ${ufInfo.nome}` : ""}` : SEM_CADASTRO,
      tooltip: "UF de origem da operação do seller — impacta prazos logísticos e disponibilidade Full. Vem do cadastro de lojas; se estiver vazia, a última carga não trouxe a UF desta loja.",
    },
    {
      icon: Globe,
      label: "Região",
      value: ufInfo?.regiao || SEM_CADASTRO,
      tooltip: "Macrorregião do IBGE correspondente à UF do seller (Norte, Nordeste, Centro-Oeste, Sudeste ou Sul). Depende da UF estar preenchida.",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-3"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-3 bg-neon-blue rounded-full" />
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Informações do Seller
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between py-1 border-b border-border/30 last:border-b-0 md:[&:nth-last-child(2)]:border-b-0"
          >
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <r.icon className="w-3 h-3" />
              <span>{r.label}</span>
              <TooltipInfo text={r.tooltip} />
            </div>
            <span className="text-[11px] font-medium text-foreground truncate max-w-[60%] text-right">
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default SellerInfoTable;
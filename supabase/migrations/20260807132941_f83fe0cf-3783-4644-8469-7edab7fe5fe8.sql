CREATE TABLE public.raw_cpp_mensal (
  cus_cust_id_sel text NOT NULL,
  tim_month_id    text NOT NULL,
  dados           jsonb NOT NULL,
  arquivo_origem  text NOT NULL,
  importado_em    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cus_cust_id_sel, tim_month_id)
);

CREATE TABLE public.raw_cdp_mensal (
  cus_cust_id_sel text NOT NULL,
  tim_month_id    text NOT NULL,
  dados           jsonb NOT NULL,
  arquivo_origem  text NOT NULL,
  importado_em    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cus_cust_id_sel, tim_month_id)
);

CREATE INDEX idx_raw_cpp_month ON public.raw_cpp_mensal (tim_month_id);
CREATE INDEX idx_raw_cpp_cust  ON public.raw_cpp_mensal (cus_cust_id_sel);
CREATE INDEX idx_raw_cdp_month ON public.raw_cdp_mensal (tim_month_id);
CREATE INDEX idx_raw_cdp_cust  ON public.raw_cdp_mensal (cus_cust_id_sel);

CREATE TABLE public.ingestao_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed text NOT NULL,
  arquivo text NOT NULL,
  status text NOT NULL,
  linhas_lidas integer,
  linhas_gravadas integer,
  erro text,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz
);
CREATE INDEX idx_ingestao_exec_feed ON public.ingestao_execucoes (feed, iniciado_em DESC);

GRANT SELECT ON public.raw_cpp_mensal TO authenticated;
GRANT SELECT ON public.raw_cdp_mensal TO authenticated;
GRANT SELECT ON public.ingestao_execucoes TO authenticated;
GRANT ALL ON public.raw_cpp_mensal TO service_role;
GRANT ALL ON public.raw_cdp_mensal TO service_role;
GRANT ALL ON public.ingestao_execucoes TO service_role;

ALTER TABLE public.raw_cpp_mensal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_cdp_mensal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestao_execucoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "raw_cpp_admin_select" ON public.raw_cpp_mensal
  FOR SELECT TO authenticated USING (public.is_admin() OR public.has_role(auth.uid(),'gerente'));
CREATE POLICY "raw_cdp_admin_select" ON public.raw_cdp_mensal
  FOR SELECT TO authenticated USING (public.is_admin() OR public.has_role(auth.uid(),'gerente'));
CREATE POLICY "ingestao_exec_admin_select" ON public.ingestao_execucoes
  FOR SELECT TO authenticated USING (public.is_admin() OR public.has_role(auth.uid(),'gerente'));
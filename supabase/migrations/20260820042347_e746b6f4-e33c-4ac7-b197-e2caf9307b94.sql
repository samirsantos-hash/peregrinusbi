CREATE TABLE public.benchmark_uplift_full (
  modal_origem text PRIMARY KEY,
  uplift_vendas numeric NOT NULL,
  uplift_visitas numeric,
  conversao_pct numeric,
  base_amostra text NOT NULL,
  fonte text NOT NULL,
  data_fonte date NOT NULL,
  usar_em_estimativa boolean NOT NULL DEFAULT true,
  observacao text,
  rotulos_origem text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.benchmark_uplift_full TO authenticated;
GRANT ALL ON public.benchmark_uplift_full TO service_role;
ALTER TABLE public.benchmark_uplift_full ENABLE ROW LEVEL SECURITY;
CREATE POLICY "benchmark_uplift_full_read" ON public.benchmark_uplift_full FOR SELECT TO authenticated USING (true);
CREATE POLICY "benchmark_uplift_full_admin" ON public.benchmark_uplift_full FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

INSERT INTO public.benchmark_uplift_full (modal_origem, uplift_vendas, uplift_visitas, conversao_pct, base_amostra, fonte, data_fonte, usar_em_estimativa, observacao, rotulos_origem) VALUES
('DS', 6.22, 3.20, 4.2, 'Top 100K itens', 'ML/EcomConsult — slide Impacto do Full', '2026-01-01', true, 'Uplift de vendas. Visitas e conversao sao painéis separados, populacoes diferentes — nao encadear.', ARRAY['Mercado Envios Places','Agência Mercado Envios','Mercado Envios Agência']),
('XD', 3.03, 2.12, 4.2, 'Top 100K itens', 'ML/EcomConsult — slide Impacto do Full', '2026-01-01', true, 'Uplift de vendas. Visitas e conversao sao painéis separados, populacoes diferentes — nao encadear.', ARRAY['Coleta do Mercado Envios']),
('ME1', 41.47, NULL, NULL, 'Base amostral 15 itens', 'ML/EcomConsult — slide Impacto do Full', '2026-01-01', false, 'Base amostral 15 — razao instavel, nao usar em estimativa.', ARRAY['Mercado Envios 1']);

CREATE TABLE public.config_estimativa (
  chave text PRIMARY KEY,
  valor numeric NOT NULL,
  descricao text NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.config_estimativa TO authenticated;
GRANT ALL ON public.config_estimativa TO service_role;
ALTER TABLE public.config_estimativa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_estimativa_read" ON public.config_estimativa FOR SELECT TO authenticated USING (true);
CREATE POLICY "config_estimativa_admin" ON public.config_estimativa FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

INSERT INTO public.config_estimativa (chave, valor, descricao) VALUES
('fator_conservadorismo_uplift_full', 0.30, 'Fracao do uplift de benchmark aplicada na estimativa conservadora. Benchmark e media de mercado sobre Top 100K mais vendidos, viesado para cima.');
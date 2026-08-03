
-- ---------- helpers ----------
CREATE OR REPLACE FUNCTION public.ml_pode_carregar()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente')
$$;

-- ---------- catálogo de fontes ----------
CREATE TABLE public.multilojas_fonte (
  id text PRIMARY KEY,
  rotulo text NOT NULL,
  descricao text,
  granularidade text,
  cor text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.multilojas_fonte TO authenticated;
GRANT ALL ON public.multilojas_fonte TO service_role;
ALTER TABLE public.multilojas_fonte ENABLE ROW LEVEL SECURITY;
CREATE POLICY fonte_leitura ON public.multilojas_fonte FOR SELECT TO authenticated USING (true);

INSERT INTO public.multilojas_fonte (id, rotulo, descricao, granularidade, cor) VALUES
  ('vendas','Base de Vendas Consolidada','Relatório nativo de Vendas do Mercado Livre / Mercado Shops','pedido','#c9a227'),
  ('catalogo','Base de Catálogo','Anúncios ativos por categoria e vertical','mensal','#3b82f6'),
  ('campanhas','Base de Campanhas','Investimento e faturamento por programa promocional','mensal','#a855f7'),
  ('performance','Base de Performance','Indicadores diários e mensais de operação','diario','#10b981');

-- ---------- contas de vendedor ----------
CREATE TABLE public.multilojas_conta (
  cust_id text PRIMARY KEY,
  nickname text,
  nivel text, cluster text, sub_cluster text, uf text,
  safra date, meses_programa int, programa text,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.multilojas_conta TO authenticated;
GRANT ALL ON public.multilojas_conta TO service_role;
ALTER TABLE public.multilojas_conta ENABLE ROW LEVEL SECURITY;
CREATE POLICY conta_leitura ON public.multilojas_conta FOR SELECT TO authenticated USING (true);
CREATE POLICY conta_escrita ON public.multilojas_conta FOR ALL TO authenticated
  USING (public.ml_pode_carregar()) WITH CHECK (public.ml_pode_carregar());

-- ---------- cadastro de lojas oficiais ----------
CREATE TABLE public.multilojas_loja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave_tecnica text NOT NULL UNIQUE,
  nome_publico text NOT NULL,
  marca text, segmento text,
  conta_id text REFERENCES public.multilojas_conta(cust_id),
  vinculo text,
  vinculo_score numeric,
  gestor_user_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.multilojas_loja TO authenticated;
GRANT ALL ON public.multilojas_loja TO service_role;
ALTER TABLE public.multilojas_loja ENABLE ROW LEVEL SECURITY;
CREATE POLICY loja_leitura ON public.multilojas_loja FOR SELECT TO authenticated USING (true);
CREATE POLICY loja_escrita ON public.multilojas_loja FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_ml_loja_upd BEFORE UPDATE ON public.multilojas_loja
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.ml_lojas_do_usuario()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.multilojas_loja WHERE gestor_user_id = auth.uid()
$$;

-- ---------- cargas ----------
CREATE TABLE public.multilojas_carga (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fonte_id text NOT NULL REFERENCES public.multilojas_fonte(id),
  arquivo text NOT NULL,
  hash text NOT NULL UNIQUE,
  bytes bigint,
  enviado_por uuid,
  responsavel text,
  linhas int, validas int,
  periodo_ini date, periodo_fim date,
  gmv numeric,
  diagnostico jsonb,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.multilojas_carga TO authenticated;
GRANT ALL ON public.multilojas_carga TO service_role;
ALTER TABLE public.multilojas_carga ENABLE ROW LEVEL SECURITY;
CREATE POLICY carga_leitura ON public.multilojas_carga FOR SELECT TO authenticated
  USING (public.ml_pode_carregar());
CREATE POLICY carga_escrita ON public.multilojas_carga FOR ALL TO authenticated
  USING (public.ml_pode_carregar()) WITH CHECK (public.ml_pode_carregar());

CREATE VIEW public.multilojas_carga_publica
WITH (security_invoker = true) AS
  SELECT id, fonte_id, responsavel, enviado_por, linhas, validas,
         periodo_ini, periodo_fim, gmv, ativa, created_at
  FROM public.multilojas_carga;
GRANT SELECT ON public.multilojas_carga_publica TO authenticated;

-- ---------- pedidos ----------
CREATE TABLE public.multilojas_pedido (
  carga_id uuid NOT NULL REFERENCES public.multilojas_carga(id) ON DELETE CASCADE,
  loja_id uuid REFERENCES public.multilojas_loja(id),
  loja_chave text,
  pedido_id text NOT NULL,
  dt timestamptz NOT NULL,
  mlb text NOT NULL DEFAULT '',
  sku text, titulo text, canal text,
  tipo_anuncio text, logistica text, uf text, cidade text, doc_hash text,
  un numeric, gmv numeric, acre numeric, tarifa numeric,
  frete_custo numeric, frete_rec numeric, desconto numeric, estorno numeric, liquido numeric,
  preco numeric, ads boolean, b2b boolean, nfe_ok boolean, nfe_status text,
  status text, cancelado boolean, devolvido boolean, mediacao boolean, reclamacao boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (carga_id, pedido_id, mlb)
);
CREATE INDEX idx_ml_pedido_dt ON public.multilojas_pedido (dt);
CREATE INDEX idx_ml_pedido_loja_dt ON public.multilojas_pedido (loja_id, dt);
CREATE INDEX idx_ml_pedido_mlb ON public.multilojas_pedido (mlb);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.multilojas_pedido TO authenticated;
GRANT ALL ON public.multilojas_pedido TO service_role;
ALTER TABLE public.multilojas_pedido ENABLE ROW LEVEL SECURITY;
CREATE POLICY pedido_leitura ON public.multilojas_pedido FOR SELECT TO authenticated
  USING (
    public.ml_pode_carregar()
    OR (public.has_role(auth.uid(),'gestor_loja')
        AND loja_id IN (SELECT public.ml_lojas_do_usuario()))
  );
CREATE POLICY pedido_escrita ON public.multilojas_pedido FOR ALL TO authenticated
  USING (public.ml_pode_carregar()) WITH CHECK (public.ml_pode_carregar());

REVOKE EXECUTE ON FUNCTION public.ml_pode_carregar() FROM anon;
REVOKE EXECUTE ON FUNCTION public.ml_lojas_do_usuario() FROM anon;

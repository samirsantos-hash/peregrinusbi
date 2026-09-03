DROP POLICY IF EXISTS "loja_leitura" ON public.multilojas_loja;
CREATE POLICY "loja_leitura" ON public.multilojas_loja
  FOR SELECT TO authenticated
  USING (
    public.ml_pode_ver_rede()
    OR id IN (SELECT public.ml_lojas_do_usuario())
  );

DROP POLICY IF EXISTS "conta_leitura" ON public.multilojas_conta;
CREATE POLICY "conta_leitura" ON public.multilojas_conta
  FOR SELECT TO authenticated
  USING (
    public.ml_pode_ver_rede()
    OR cust_id IN (
      SELECT l.conta_id FROM public.multilojas_loja l
      WHERE l.id IN (SELECT public.ml_lojas_do_usuario())
    )
  );
CREATE TABLE public.grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  dono_user_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupos TO authenticated;
GRANT ALL ON public.grupos TO service_role;

ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grupos_select_consultor_ou_dono"
ON public.grupos FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'gerente')
  OR dono_user_id = auth.uid()
);

CREATE POLICY "grupos_insert_admin_gerente"
ON public.grupos FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));

CREATE POLICY "grupos_update_admin_gerente"
ON public.grupos FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));

CREATE POLICY "grupos_delete_admin"
ON public.grupos FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_grupos_upd
BEFORE UPDATE ON public.grupos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sellers ADD COLUMN grupo_id uuid REFERENCES public.grupos(id) ON DELETE SET NULL;
CREATE INDEX idx_sellers_grupo_id ON public.sellers(grupo_id);

CREATE OR REPLACE FUNCTION public.get_perfil()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') THEN 'consultor'
    WHEN EXISTS (SELECT 1 FROM public.grupos WHERE dono_user_id = auth.uid() AND ativo) THEN 'dono_grupo'
    ELSE 'gestor_loja'
  END
$$;

REVOKE EXECUTE ON FUNCTION public.get_perfil() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_perfil() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_meus_grupos()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.grupos WHERE dono_user_id = auth.uid() AND ativo
$$;

REVOKE EXECUTE ON FUNCTION public.get_meus_grupos() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_meus_grupos() TO authenticated;
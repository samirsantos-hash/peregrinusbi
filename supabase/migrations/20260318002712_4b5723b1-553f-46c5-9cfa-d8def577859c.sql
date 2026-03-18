
CREATE TABLE public.portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cust_ids text[] NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all portfolios"
ON public.portfolios FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gerentes manage own portfolios"
ON public.portfolios FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'gerente') AND created_by = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'gerente') AND created_by = auth.uid());

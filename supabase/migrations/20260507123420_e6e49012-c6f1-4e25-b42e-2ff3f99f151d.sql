
ALTER TABLE public.portfolios
ADD COLUMN assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

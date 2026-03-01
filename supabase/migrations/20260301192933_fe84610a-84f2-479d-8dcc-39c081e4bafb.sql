
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. RLS policies for user_roles
CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Create user_access_control table
CREATE TABLE public.user_access_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email text NOT NULL,
  cnpj text,
  allowed_cust_ids text[] NOT NULL DEFAULT '{}',
  temp_password_expires_at timestamptz,
  must_change_password boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_access_control ENABLE ROW LEVEL SECURITY;

-- 6. RLS for user_access_control
CREATE POLICY "Users can read own access"
  ON public.user_access_control FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all access"
  ON public.user_access_control FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. Function to get allowed cust_ids for current user
CREATE OR REPLACE FUNCTION public.get_allowed_cust_ids()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT allowed_cust_ids FROM public.user_access_control WHERE user_id = auth.uid() LIMIT 1),
    '{}'::text[]
  )
$$;

-- 8. Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- 9. Drop existing permissive public policies on sellers/sellers_kpi
DROP POLICY IF EXISTS "Allow public read sellers" ON public.sellers;
DROP POLICY IF EXISTS "Allow public read KPIs" ON public.sellers_kpi;

-- 10. New RLS: Admins see all, users see only allowed cust_ids
CREATE POLICY "Admins read all sellers"
  ON public.sellers FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users read allowed sellers"
  ON public.sellers FOR SELECT
  USING (cust_id = ANY(public.get_allowed_cust_ids()));

CREATE POLICY "Admins can insert sellers"
  ON public.sellers FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update sellers"
  ON public.sellers FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete sellers"
  ON public.sellers FOR DELETE
  USING (public.is_admin());

-- 11. sellers_kpi: admins see all, users see only their allowed sellers
CREATE POLICY "Admins read all KPIs"
  ON public.sellers_kpi FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users read allowed KPIs"
  ON public.sellers_kpi FOR SELECT
  USING (
    seller_id IN (
      SELECT id FROM public.sellers WHERE cust_id = ANY(public.get_allowed_cust_ids())
    )
  );

CREATE POLICY "Admins can insert KPIs"
  ON public.sellers_kpi FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update KPIs"
  ON public.sellers_kpi FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete KPIs"
  ON public.sellers_kpi FOR DELETE
  USING (public.is_admin());

-- 12. Profiles table for user metadata
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 13. Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'email');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

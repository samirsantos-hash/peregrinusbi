
-- Fix 1: Remove plaintext temp_password from user_access_control
UPDATE public.user_access_control SET temp_password = NULL;
ALTER TABLE public.user_access_control DROP COLUMN temp_password;

-- Fix 2: Add missing UPDATE and DELETE policies on profiles
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

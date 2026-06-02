-- Create body measurements table for tracking weight, body fat and waist circumference over time
CREATE TABLE IF NOT EXISTS public.body_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE NOT NULL,
  weight_kg numeric NOT NULL,
  body_fat_pct numeric,
  waist_cm numeric,
  performed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexing for fast search per user and date sorting
CREATE INDEX IF NOT EXISTS body_measurements_user_id_idx ON public.body_measurements (user_id);
CREATE INDEX IF NOT EXISTS body_measurements_performed_at_idx ON public.body_measurements (performed_at);

-- Enable RLS
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

-- Select policy
DROP POLICY IF EXISTS "body_measurements_select_own" ON public.body_measurements;
CREATE POLICY "body_measurements_select_own"
  ON public.body_measurements FOR SELECT
  USING (user_id = auth.uid());

-- Insert policy
DROP POLICY IF EXISTS "body_measurements_insert_own" ON public.body_measurements;
CREATE POLICY "body_measurements_insert_own"
  ON public.body_measurements FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Update policy
DROP POLICY IF EXISTS "body_measurements_update_own" ON public.body_measurements;
CREATE POLICY "body_measurements_update_own"
  ON public.body_measurements FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Delete policy
DROP POLICY IF EXISTS "body_measurements_delete_own" ON public.body_measurements;
CREATE POLICY "body_measurements_delete_own"
  ON public.body_measurements FOR DELETE
  USING (user_id = auth.uid());

-- Daily protein logs for Recovery adherence loop
CREATE TABLE IF NOT EXISTS public.protein_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE NOT NULL,
  protein_g numeric NOT NULL CHECK (protein_g > 0 AND protein_g <= 500),
  label text,
  source text NOT NULL CHECK (source IN ('quick', 'manual', 'post_workout')),
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS protein_logs_user_id_idx ON public.protein_logs (user_id);
CREATE INDEX IF NOT EXISTS protein_logs_user_logged_at_idx ON public.protein_logs (user_id, logged_at DESC);

ALTER TABLE public.protein_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "protein_logs_select_own" ON public.protein_logs;
CREATE POLICY "protein_logs_select_own"
  ON public.protein_logs FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "protein_logs_insert_own" ON public.protein_logs;
CREATE POLICY "protein_logs_insert_own"
  ON public.protein_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "protein_logs_update_own" ON public.protein_logs;
CREATE POLICY "protein_logs_update_own"
  ON public.protein_logs FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "protein_logs_delete_own" ON public.protein_logs;
CREATE POLICY "protein_logs_delete_own"
  ON public.protein_logs FOR DELETE
  USING (user_id = auth.uid());

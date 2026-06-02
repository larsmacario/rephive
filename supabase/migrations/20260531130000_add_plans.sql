-- Training plans: ordered days mapping to workouts or rest days
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  sub text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  current_day integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plan_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans (id) ON DELETE CASCADE,
  position integer NOT NULL,
  workout_id uuid REFERENCES public.workouts (id) ON DELETE SET NULL,
  note text,
  UNIQUE (plan_id, position)
);

CREATE INDEX IF NOT EXISTS plans_user_id_idx ON public.plans (user_id);
CREATE INDEX IF NOT EXISTS plans_user_active_idx ON public.plans (user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS plan_days_plan_id_idx ON public.plan_days (plan_id);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plans"
  ON public.plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plans"
  ON public.plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans"
  ON public.plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own plans"
  ON public.plans FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own plan days"
  ON public.plan_days FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = plan_days.plan_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own plan days"
  ON public.plan_days FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = plan_days.plan_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own plan days"
  ON public.plan_days FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = plan_days.plan_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = plan_days.plan_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own plan days"
  ON public.plan_days FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = plan_days.plan_id AND p.user_id = auth.uid()
    )
  );

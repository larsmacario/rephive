-- MetCon timer columns on plan_day_blocks (table may exist without them from earlier migration)
ALTER TABLE public.plan_day_blocks
  ADD COLUMN IF NOT EXISTS work_seconds integer,
  ADD COLUMN IF NOT EXISTS rest_seconds integer,
  ADD COLUMN IF NOT EXISTS rest_between_rounds_seconds integer,
  ADD COLUMN IF NOT EXISTS prep_seconds integer DEFAULT 5;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS metcon_results jsonb NOT NULL DEFAULT '{}'::jsonb;

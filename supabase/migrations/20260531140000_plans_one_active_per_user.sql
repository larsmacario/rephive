-- Ensure at most one active plan per user
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM public.plans
  WHERE is_active = true
)
UPDATE public.plans
SET is_active = false
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS plans_one_active_per_user_idx
  ON public.plans (user_id)
  WHERE is_active = true;

-- Remove workouts layer: exercises live directly on plan_days

-- ---------------------------------------------------------------------------
-- plan_day_exercises
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_day_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_day_id uuid NOT NULL REFERENCES public.plan_days (id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  note text,
  sets jsonb NOT NULL DEFAULT '[]'::jsonb,
  metric_type text NOT NULL DEFAULT 'weight_reps',
  superset_id uuid,
  catalog_exercise_id uuid REFERENCES public.exercises (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS plan_day_exercises_plan_day_id_idx
  ON public.plan_day_exercises (plan_day_id);

CREATE UNIQUE INDEX IF NOT EXISTS plan_day_exercises_day_position_idx
  ON public.plan_day_exercises (plan_day_id, position);

-- ---------------------------------------------------------------------------
-- plan_days: add name, migrate data, drop workout_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.plan_days
  ADD COLUMN IF NOT EXISTS name text;

-- Copy exercises from linked workouts into plan_day_exercises
INSERT INTO public.plan_day_exercises (
  plan_day_id,
  position,
  name,
  note,
  sets,
  metric_type,
  superset_id,
  catalog_exercise_id
)
SELECT
  pd.id,
  we.position,
  we.name,
  we.note,
  we.sets,
  we.metric_type,
  we.superset_id,
  we.catalog_exercise_id
FROM public.plan_days pd
JOIN public.workout_exercises we ON we.workout_id = pd.workout_id
WHERE pd.workout_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Set day names from workout names
UPDATE public.plan_days pd
SET name = w.name
FROM public.workouts w
WHERE pd.workout_id = w.id
  AND pd.name IS NULL;

-- Default name for remaining days with position
UPDATE public.plan_days
SET name = 'Tag ' || (position + 1)::text
WHERE name IS NULL;

-- Remove rest days (no workout linked)
DELETE FROM public.plan_days
WHERE workout_id IS NULL;

-- ---------------------------------------------------------------------------
-- sessions: plan_day_id instead of workout_id (before dropping plan_days.workout_id)
-- ---------------------------------------------------------------------------
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS plan_day_id uuid REFERENCES public.plan_days (id) ON DELETE SET NULL;

UPDATE public.sessions s
SET plan_day_id = pd.id
FROM public.plan_days pd
WHERE s.workout_id IS NOT NULL
  AND pd.workout_id = s.workout_id
  AND s.plan_day_id IS NULL;

ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_workout_id_fkey;

ALTER TABLE public.sessions
  DROP COLUMN IF EXISTS workout_id;

-- Drop FK and column workout_id from plan_days
ALTER TABLE public.plan_days
  DROP CONSTRAINT IF EXISTS plan_days_workout_id_fkey;

ALTER TABLE public.plan_days
  DROP COLUMN IF EXISTS workout_id;

-- ---------------------------------------------------------------------------
-- RLS: plan_day_exercises
-- ---------------------------------------------------------------------------
ALTER TABLE public.plan_day_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plan day exercises"
  ON public.plan_day_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_days pd
      JOIN public.plans p ON p.id = pd.plan_id
      WHERE pd.id = plan_day_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own plan day exercises"
  ON public.plan_day_exercises FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plan_days pd
      JOIN public.plans p ON p.id = pd.plan_id
      WHERE pd.id = plan_day_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own plan day exercises"
  ON public.plan_day_exercises FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_days pd
      JOIN public.plans p ON p.id = pd.plan_id
      WHERE pd.id = plan_day_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plan_days pd
      JOIN public.plans p ON p.id = pd.plan_id
      WHERE pd.id = plan_day_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own plan day exercises"
  ON public.plan_day_exercises FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_days pd
      JOIN public.plans p ON p.id = pd.plan_id
      WHERE pd.id = plan_day_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "plan_day_exercises_select_coach"
  ON public.plan_day_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_days pd
      JOIN public.plans p ON p.id = pd.plan_id
      WHERE pd.id = plan_day_id AND public.athlete_shared(p.user_id, 'plans')
    )
  );

-- ---------------------------------------------------------------------------
-- Drop workouts + workout_exercises
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "workouts_select_coach" ON public.workouts;
DROP POLICY IF EXISTS "workout_exercises_select_coach" ON public.workout_exercises;

DROP TABLE IF EXISTS public.workout_exercises CASCADE;
DROP TABLE IF EXISTS public.workouts CASCADE;

-- ---------------------------------------------------------------------------
-- Coaching: remove workouts permission
-- ---------------------------------------------------------------------------
ALTER TABLE public.coaching_share_permissions
  DROP COLUMN IF EXISTS workouts;

CREATE OR REPLACE FUNCTION public.athlete_shared(p_athlete_id uuid, p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.coaching_relationships r
    JOIN public.coaching_share_permissions sp ON sp.relationship_id = r.id
    WHERE r.status = 'active'
      AND r.athlete_id = p_athlete_id
      AND r.coach_id = auth.uid()
      AND (
        (p_permission = 'sessions' AND sp.sessions)
        OR (p_permission = 'plans' AND sp.plans)
        OR (p_permission = 'body_measurements' AND sp.body_measurements)
        OR (p_permission = 'body_photos' AND sp.body_photos)
        OR (p_permission = 'anamnesis' AND sp.anamnesis)
        OR (p_permission = 'stats_summary' AND sp.stats_summary)
      )
  );
$$;

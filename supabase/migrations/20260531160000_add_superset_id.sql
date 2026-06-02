-- Group exercises into supersets (rest after full round, not between exercises)
ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS superset_id uuid;

ALTER TABLE public.session_exercises
  ADD COLUMN IF NOT EXISTS superset_id uuid;

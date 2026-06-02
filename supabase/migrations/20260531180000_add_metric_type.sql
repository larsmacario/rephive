-- reps = Wiederholungen (+ optional kg); time = Dauer in Sekunden (reps-Feld), kg ignoriert
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS metric_type text NOT NULL DEFAULT 'reps'
  CHECK (metric_type IN ('reps', 'time'));

ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS metric_type text NOT NULL DEFAULT 'reps'
  CHECK (metric_type IN ('reps', 'time'));

ALTER TABLE public.session_exercises
  ADD COLUMN IF NOT EXISTS metric_type text NOT NULL DEFAULT 'reps'
  CHECK (metric_type IN ('reps', 'time'));

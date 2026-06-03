-- Optional YouTube link on user-owned catalog exercises
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS youtube_url text;

-- Link workout rows to catalog exercise (for video lookup after renames)
ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS catalog_exercise_id uuid REFERENCES public.exercises (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS workout_exercises_catalog_exercise_id_idx
  ON public.workout_exercises (catalog_exercise_id);

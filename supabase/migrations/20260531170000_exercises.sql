-- Global + user-owned exercise catalog
CREATE TABLE IF NOT EXISTS public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  muscle_group text NOT NULL,
  equipment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exercises_user_id_idx ON public.exercises (user_id);
CREATE INDEX IF NOT EXISTS exercises_muscle_group_idx ON public.exercises (muscle_group);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exercises_select" ON public.exercises;
CREATE POLICY "exercises_select"
  ON public.exercises FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "exercises_insert_own" ON public.exercises;
CREATE POLICY "exercises_insert_own"
  ON public.exercises FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "exercises_update_own" ON public.exercises;
CREATE POLICY "exercises_update_own"
  ON public.exercises FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "exercises_delete_own" ON public.exercises;
CREATE POLICY "exercises_delete_own"
  ON public.exercises FOR DELETE
  USING (user_id = auth.uid());

-- Standard catalog (global, user_id NULL)
INSERT INTO public.exercises (id, user_id, name, muscle_group, equipment) VALUES
  ('e0000001-0000-4000-8000-000000000001', NULL, 'Bankdrücken', 'Brust', 'Langhantel'),
  ('e0000002-0000-4000-8000-000000000002', NULL, 'Dips', 'Brust', 'Körpergewicht'),
  ('e0000003-0000-4000-8000-000000000003', NULL, 'Klimmzüge', 'Rücken', 'Körpergewicht'),
  ('e0000004-0000-4000-8000-000000000004', NULL, 'Kreuzheben', 'Rücken', 'Langhantel'),
  ('e0000005-0000-4000-8000-000000000005', NULL, 'Langhantelrudern', 'Rücken', 'Langhantel'),
  ('e0000006-0000-4000-8000-000000000006', NULL, 'Latzug', 'Rücken', 'Kabel'),
  ('e0000007-0000-4000-8000-000000000007', NULL, 'Kniebeuge', 'Beine', 'Langhantel'),
  ('e0000008-0000-4000-8000-000000000008', NULL, 'Beinpresse', 'Beine', 'Maschine'),
  ('e0000009-0000-4000-8000-000000000009', NULL, 'Rumänisches KH', 'Beine', 'Langhantel'),
  ('e000000a-0000-4000-8000-00000000000a', NULL, 'Schulterdrücken', 'Schultern', 'Langhantel'),
  ('e000000b-0000-4000-8000-00000000000b', NULL, 'Seitheben', 'Schultern', 'Kurzhantel'),
  ('e000000c-0000-4000-8000-00000000000c', NULL, 'Bizeps Curls', 'Arme', 'Kurzhantel')
ON CONFLICT (id) DO NOTHING;

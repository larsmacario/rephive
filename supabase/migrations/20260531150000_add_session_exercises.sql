-- Per-session exercise and set snapshots (actual tracked data)
CREATE TABLE IF NOT EXISTS public.session_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  position integer NOT NULL,
  name text NOT NULL,
  note text,
  sets jsonb NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (session_id, position)
);

CREATE INDEX IF NOT EXISTS session_exercises_session_id_idx ON public.session_exercises (session_id);

ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own session exercises"
  ON public.session_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_exercises.session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own session exercises"
  ON public.session_exercises FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_exercises.session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own session exercises"
  ON public.session_exercises FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_exercises.session_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_exercises.session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own session exercises"
  ON public.session_exercises FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_exercises.session_id AND s.user_id = auth.uid()
    )
  );

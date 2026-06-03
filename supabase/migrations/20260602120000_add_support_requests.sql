-- Support-Anfragen aus der App (SupportScreen)
CREATE TABLE IF NOT EXISTS public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL CHECK (category IN ('bug', 'question', 'feedback', 'account', 'other')),
  contact_email text NOT NULL,
  message text NOT NULL CHECK (char_length(trim(message)) >= 10),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_requests_user_id_idx ON public.support_requests (user_id);
CREATE INDEX IF NOT EXISTS support_requests_created_at_idx ON public.support_requests (created_at DESC);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_requests_insert_own" ON public.support_requests;
CREATE POLICY "support_requests_insert_own"
  ON public.support_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "support_requests_select_own" ON public.support_requests;
CREATE POLICY "support_requests_select_own"
  ON public.support_requests FOR SELECT
  USING (user_id = auth.uid());

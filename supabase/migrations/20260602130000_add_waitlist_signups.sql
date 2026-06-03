-- Warteliste (Landingpage rephive.app)
CREATE TABLE IF NOT EXISTS public.waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  privacy_accepted_at timestamptz NOT NULL,
  newsletter_opt_in boolean NOT NULL,
  source text NOT NULL DEFAULT 'landing',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_signups_email_unique UNIQUE (email),
  CONSTRAINT waitlist_signups_newsletter_opt_in_check CHECK (newsletter_opt_in = true)
);

CREATE INDEX IF NOT EXISTS waitlist_signups_created_at_idx
  ON public.waitlist_signups (created_at DESC);

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

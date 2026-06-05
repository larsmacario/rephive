-- Coaching: relationships, permissions, messages, notes + RLS helpers

CREATE TYPE public.coaching_initiator AS ENUM ('athlete', 'coach');
CREATE TYPE public.coaching_relationship_status AS ENUM ('pending', 'active', 'declined', 'revoked');

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS coach_enabled boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- coaching_relationships
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coaching_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  coach_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  athlete_email text NOT NULL,
  coach_email text NOT NULL,
  initiated_by public.coaching_initiator NOT NULL,
  status public.coaching_relationship_status NOT NULL DEFAULT 'pending',
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  CONSTRAINT coaching_relationships_participants_chk CHECK (
    athlete_id IS NOT NULL OR coach_id IS NOT NULL OR initiated_by IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS coaching_relationships_athlete_id_idx
  ON public.coaching_relationships (athlete_id)
  WHERE athlete_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS coaching_relationships_coach_id_idx
  ON public.coaching_relationships (coach_id)
  WHERE coach_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS coaching_relationships_athlete_email_idx
  ON public.coaching_relationships (lower(athlete_email));

CREATE INDEX IF NOT EXISTS coaching_relationships_coach_email_idx
  ON public.coaching_relationships (lower(coach_email));

CREATE UNIQUE INDEX IF NOT EXISTS coaching_relationships_active_pair_uid_idx
  ON public.coaching_relationships (athlete_id, coach_id)
  WHERE status IN ('pending', 'active') AND athlete_id IS NOT NULL AND coach_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- coaching_share_permissions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coaching_share_permissions (
  relationship_id uuid PRIMARY KEY REFERENCES public.coaching_relationships (id) ON DELETE CASCADE,
  sessions boolean NOT NULL DEFAULT false,
  plans boolean NOT NULL DEFAULT false,
  workouts boolean NOT NULL DEFAULT false,
  body_measurements boolean NOT NULL DEFAULT false,
  body_photos boolean NOT NULL DEFAULT false,
  anamnesis boolean NOT NULL DEFAULT false,
  stats_summary boolean NOT NULL DEFAULT false,
  consent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- coaching_messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coaching_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL REFERENCES public.coaching_relationships (id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS coaching_messages_relationship_created_idx
  ON public.coaching_messages (relationship_id, created_at);

CREATE INDEX IF NOT EXISTS coaching_messages_unread_idx
  ON public.coaching_messages (relationship_id, read_at)
  WHERE read_at IS NULL;

-- ---------------------------------------------------------------------------
-- coaching_notes
-- ---------------------------------------------------------------------------
CREATE TYPE public.coaching_note_target AS ENUM ('session', 'plan');

CREATE TABLE IF NOT EXISTS public.coaching_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL REFERENCES public.coaching_relationships (id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  target_type public.coaching_note_target NOT NULL,
  target_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(trim(body)) >= 1),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coaching_notes_target_idx
  ON public.coaching_notes (target_type, target_id, created_at);

-- ---------------------------------------------------------------------------
-- Security definer helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_active_coach_of(p_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.coaching_relationships r
    WHERE r.status = 'active'
      AND r.coach_id = auth.uid()
      AND r.athlete_id = p_athlete_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_athlete_of(p_coach_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.coaching_relationships r
    WHERE r.status = 'active'
      AND r.athlete_id = auth.uid()
      AND r.coach_id = p_coach_id
  );
$$;

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
    JOIN public.coaching_share_permissions p ON p.relationship_id = r.id
    WHERE r.status = 'active'
      AND r.coach_id = auth.uid()
      AND r.athlete_id = p_athlete_id
      AND (
        (p_permission = 'sessions' AND p.sessions)
        OR (p_permission = 'plans' AND p.plans)
        OR (p_permission = 'workouts' AND p.workouts)
        OR (p_permission = 'body_measurements' AND p.body_measurements)
        OR (p_permission = 'body_photos' AND p.body_photos)
        OR (p_permission = 'anamnesis' AND p.anamnesis)
        OR (p_permission = 'stats_summary' AND p.stats_summary)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.coaching_relationship_visible(p_relationship_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.coaching_relationships r
    WHERE r.id = p_relationship_id
      AND (
        r.athlete_id = auth.uid()
        OR r.coach_id = auth.uid()
        OR (
          r.status = 'pending'
          AND r.initiated_by = 'athlete'
          AND lower(r.coach_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
        OR (
          r.status = 'pending'
          AND r.initiated_by = 'coach'
          AND lower(r.athlete_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_coach_of(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_athlete_of(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.athlete_shared(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.coaching_relationship_visible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_coach_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_athlete_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.athlete_shared(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.coaching_relationship_visible(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: coaching tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.coaching_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_share_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coaching_relationships_select" ON public.coaching_relationships;
CREATE POLICY "coaching_relationships_select"
  ON public.coaching_relationships FOR SELECT
  USING (
    athlete_id = auth.uid()
    OR coach_id = auth.uid()
    OR (
      status = 'pending'
      AND initiated_by = 'athlete'
      AND lower(coach_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    OR (
      status = 'pending'
      AND initiated_by = 'coach'
      AND lower(athlete_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

DROP POLICY IF EXISTS "coaching_relationships_insert" ON public.coaching_relationships;
CREATE POLICY "coaching_relationships_insert"
  ON public.coaching_relationships FOR INSERT
  WITH CHECK (
    (initiated_by = 'athlete' AND athlete_id = auth.uid())
    OR (initiated_by = 'coach' AND coach_id = auth.uid())
  );

DROP POLICY IF EXISTS "coaching_relationships_update" ON public.coaching_relationships;
CREATE POLICY "coaching_relationships_update"
  ON public.coaching_relationships FOR UPDATE
  USING (
    athlete_id = auth.uid()
    OR coach_id = auth.uid()
    OR (
      status = 'pending'
      AND initiated_by = 'athlete'
      AND lower(coach_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    OR (
      status = 'pending'
      AND initiated_by = 'coach'
      AND lower(athlete_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
  WITH CHECK (
    athlete_id = auth.uid()
    OR coach_id = auth.uid()
    OR (
      status IN ('pending', 'active', 'declined')
      AND initiated_by = 'athlete'
      AND lower(coach_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    OR (
      status IN ('pending', 'active', 'declined')
      AND initiated_by = 'coach'
      AND lower(athlete_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

DROP POLICY IF EXISTS "coaching_share_permissions_select" ON public.coaching_share_permissions;
CREATE POLICY "coaching_share_permissions_select"
  ON public.coaching_share_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_relationships r
      WHERE r.id = relationship_id
        AND (r.athlete_id = auth.uid() OR r.coach_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "coaching_share_permissions_insert" ON public.coaching_share_permissions;
CREATE POLICY "coaching_share_permissions_insert"
  ON public.coaching_share_permissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaching_relationships r
      WHERE r.id = relationship_id AND r.athlete_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "coaching_share_permissions_update" ON public.coaching_share_permissions;
CREATE POLICY "coaching_share_permissions_update"
  ON public.coaching_share_permissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_relationships r
      WHERE r.id = relationship_id AND r.athlete_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaching_relationships r
      WHERE r.id = relationship_id AND r.athlete_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "coaching_messages_select" ON public.coaching_messages;
CREATE POLICY "coaching_messages_select"
  ON public.coaching_messages FOR SELECT
  USING (public.coaching_relationship_visible(relationship_id));

DROP POLICY IF EXISTS "coaching_messages_insert" ON public.coaching_messages;
CREATE POLICY "coaching_messages_insert"
  ON public.coaching_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND public.coaching_relationship_visible(relationship_id)
    AND EXISTS (
      SELECT 1 FROM public.coaching_relationships r
      WHERE r.id = relationship_id AND r.status = 'active'
    )
  );

DROP POLICY IF EXISTS "coaching_messages_update" ON public.coaching_messages;
CREATE POLICY "coaching_messages_update"
  ON public.coaching_messages FOR UPDATE
  USING (public.coaching_relationship_visible(relationship_id))
  WITH CHECK (public.coaching_relationship_visible(relationship_id));

DROP POLICY IF EXISTS "coaching_notes_select" ON public.coaching_notes;
CREATE POLICY "coaching_notes_select"
  ON public.coaching_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_relationships r
      WHERE r.id = relationship_id
        AND r.status = 'active'
        AND (r.athlete_id = auth.uid() OR r.coach_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "coaching_notes_insert" ON public.coaching_notes;
CREATE POLICY "coaching_notes_insert"
  ON public.coaching_notes FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.coaching_relationships r
      JOIN public.coaching_share_permissions p ON p.relationship_id = r.id
      WHERE r.id = relationship_id
        AND r.status = 'active'
        AND r.coach_id = auth.uid()
        AND (
          (target_type = 'session' AND p.sessions)
          OR (target_type = 'plan' AND p.plans)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Coach read access on athlete data (SELECT only)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "sessions_select_coach" ON public.sessions;
CREATE POLICY "sessions_select_coach"
  ON public.sessions FOR SELECT
  USING (public.athlete_shared(user_id, 'sessions'));

DROP POLICY IF EXISTS "session_exercises_select_coach" ON public.session_exercises;
CREATE POLICY "session_exercises_select_coach"
  ON public.session_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND public.athlete_shared(s.user_id, 'sessions')
    )
  );

DROP POLICY IF EXISTS "plans_select_coach" ON public.plans;
CREATE POLICY "plans_select_coach"
  ON public.plans FOR SELECT
  USING (public.athlete_shared(user_id, 'plans'));

DROP POLICY IF EXISTS "plan_days_select_coach" ON public.plan_days;
CREATE POLICY "plan_days_select_coach"
  ON public.plan_days FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = plan_id AND public.athlete_shared(p.user_id, 'plans')
    )
  );

DROP POLICY IF EXISTS "workouts_select_coach" ON public.workouts;
CREATE POLICY "workouts_select_coach"
  ON public.workouts FOR SELECT
  USING (
    user_id IS NOT NULL AND public.athlete_shared(user_id, 'workouts')
  );

DROP POLICY IF EXISTS "workout_exercises_select_coach" ON public.workout_exercises;
CREATE POLICY "workout_exercises_select_coach"
  ON public.workout_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_id
        AND w.user_id IS NOT NULL
        AND public.athlete_shared(w.user_id, 'workouts')
    )
  );

DROP POLICY IF EXISTS "body_measurements_select_coach" ON public.body_measurements;
CREATE POLICY "body_measurements_select_coach"
  ON public.body_measurements FOR SELECT
  USING (public.athlete_shared(user_id, 'body_measurements'));

DROP POLICY IF EXISTS "body_photos_select_coach" ON public.body_photos;
CREATE POLICY "body_photos_select_coach"
  ON public.body_photos FOR SELECT
  USING (public.athlete_shared(user_id, 'body_photos'));

-- Filtered athlete profile for coaches (no full preferences leak)
CREATE OR REPLACE FUNCTION public.coach_client_profile(p_athlete_id uuid)
RETURNS TABLE (
  display_name text,
  birth_date date,
  anamnesis jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs jsonb;
BEGIN
  IF NOT public.is_active_coach_of(p_athlete_id) THEN
    RETURN;
  END IF;

  SELECT p.display_name, p.birth_date, p.preferences
  INTO display_name, birth_date, v_prefs
  FROM public.profiles p
  WHERE p.id = p_athlete_id;

  IF public.athlete_shared(p_athlete_id, 'anamnesis') THEN
    anamnesis := v_prefs -> 'anamnesis';
  ELSE
    anamnesis := NULL;
  END IF;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.coach_client_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.coach_client_profile(uuid) TO authenticated;

-- Coach storage read for shared body photos
DROP POLICY IF EXISTS "Allow coach to read shared body photos" ON storage.objects;
CREATE POLICY "Allow coach to read shared body photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'body-photos'
    AND public.athlete_shared(((storage.foldername(name))[1])::uuid, 'body_photos')
  );

-- Signup role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
  v_display_name text;
BEGIN
  v_display_name := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1));
  v_role := 'athlet';
  IF (new.raw_user_meta_data ->> 'app_role') = 'coach' THEN
    v_role := 'coach';
  END IF;

  INSERT INTO public.profiles (id, display_name, role, coach_enabled, preferences)
  VALUES (
    new.id,
    v_display_name,
    v_role,
    v_role = 'coach',
    '{}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE
  SET
    display_name = coalesce(excluded.display_name, profiles.display_name),
    role = CASE
      WHEN excluded.role = 'coach' THEN 'coach'::public.app_role
      ELSE profiles.role
    END,
    coach_enabled = profiles.coach_enabled OR excluded.coach_enabled;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR USER supabase_auth_admin
  EXECUTE FUNCTION public.handle_new_user();

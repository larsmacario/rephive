-- Revert coaching feature (tables, RLS, storage, signup hook)

-- Coach SELECT policies on athlete data
DROP POLICY IF EXISTS "sessions_select_coach" ON public.sessions;
DROP POLICY IF EXISTS "session_exercises_select_coach" ON public.session_exercises;
DROP POLICY IF EXISTS "plans_select_coach" ON public.plans;
DROP POLICY IF EXISTS "plan_days_select_coach" ON public.plan_days;
DROP POLICY IF EXISTS "plan_day_exercises_select_coach" ON public.plan_day_exercises;
DROP POLICY IF EXISTS "body_measurements_select_coach" ON public.body_measurements;
DROP POLICY IF EXISTS "body_photos_select_coach" ON public.body_photos;

-- Coaching table policies
DROP POLICY IF EXISTS "coaching_relationships_select" ON public.coaching_relationships;
DROP POLICY IF EXISTS "coaching_relationships_insert" ON public.coaching_relationships;
DROP POLICY IF EXISTS "coaching_relationships_update" ON public.coaching_relationships;
DROP POLICY IF EXISTS "coaching_share_permissions_select" ON public.coaching_share_permissions;
DROP POLICY IF EXISTS "coaching_share_permissions_insert" ON public.coaching_share_permissions;
DROP POLICY IF EXISTS "coaching_share_permissions_update" ON public.coaching_share_permissions;
DROP POLICY IF EXISTS "coaching_messages_select" ON public.coaching_messages;
DROP POLICY IF EXISTS "coaching_messages_insert" ON public.coaching_messages;
DROP POLICY IF EXISTS "coaching_messages_update" ON public.coaching_messages;
DROP POLICY IF EXISTS "coaching_notes_select" ON public.coaching_notes;
DROP POLICY IF EXISTS "coaching_notes_insert" ON public.coaching_notes;

DROP POLICY IF EXISTS "Allow coach to read shared body photos" ON storage.objects;

DROP TABLE IF EXISTS public.coaching_notes CASCADE;
DROP TABLE IF EXISTS public.coaching_messages CASCADE;
DROP TABLE IF EXISTS public.coaching_share_permissions CASCADE;
DROP TABLE IF EXISTS public.coaching_relationships CASCADE;

DROP FUNCTION IF EXISTS public.coach_client_profile(uuid);
DROP FUNCTION IF EXISTS public.athlete_shared(uuid, text);
DROP FUNCTION IF EXISTS public.coaching_relationship_visible(uuid);
DROP FUNCTION IF EXISTS public.is_active_athlete_of(uuid);
DROP FUNCTION IF EXISTS public.is_active_coach_of(uuid);

DROP TYPE IF EXISTS public.coaching_note_target;
DROP TYPE IF EXISTS public.coaching_initiator;
DROP TYPE IF EXISTS public.coaching_relationship_status;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS coach_enabled;

UPDATE storage.buckets SET public = true WHERE id = 'body-photos';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name text;
BEGIN
  v_display_name := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1));

  INSERT INTO public.profiles (id, display_name, role, preferences)
  VALUES (
    new.id,
    v_display_name,
    'athlet'::public.app_role,
    '{}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE
  SET display_name = coalesce(excluded.display_name, profiles.display_name);

  RETURN new;
END;
$$;

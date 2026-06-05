-- Owner accounts use the same coach capabilities as coaches
UPDATE public.profiles
SET coach_enabled = true
WHERE role = 'owner' AND coach_enabled = false;

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
    v_role IN ('coach', 'owner'),
    '{}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE
  SET
    display_name = coalesce(excluded.display_name, profiles.display_name),
    role = CASE
      WHEN excluded.role IN ('coach', 'owner') THEN excluded.role
      ELSE profiles.role
    END,
    coach_enabled = profiles.coach_enabled OR excluded.coach_enabled OR profiles.role = 'owner';

  RETURN new;
END;
$$;

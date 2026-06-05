-- Ensure auth.users deletion cascades to core user-owned tables.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'profiles'
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid) LIKE '%auth.users%'
  ) LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'workouts'
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid) LIKE '%auth.users%'
  ) LOOP
    EXECUTE format('ALTER TABLE public.workouts DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.workouts
  ADD CONSTRAINT workouts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'sessions'
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid) LIKE '%auth.users%'
  ) LOOP
    EXECUTE format('ALTER TABLE public.sessions DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

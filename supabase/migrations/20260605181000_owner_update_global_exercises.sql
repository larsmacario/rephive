-- Allow app owners to update global catalog exercises (user_id IS NULL).

DROP POLICY IF EXISTS "exercises_update_global_owner" ON public.exercises;

CREATE POLICY "exercises_update_global_owner"
  ON public.exercises FOR UPDATE
  USING (
    user_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'owner'
    )
  )
  WITH CHECK (
    user_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'owner'
    )
  );

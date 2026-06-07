-- plan_day_blocks: block-level format & timer config (MetCon AMRAP/EMOM/Circuit)
-- plan_day_exercises.block_id links exercises to their block row.

CREATE TABLE IF NOT EXISTS public.plan_day_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_day_id uuid NOT NULL REFERENCES public.plan_days (id) ON DELETE CASCADE,
  block_type text NOT NULL,
  format text NOT NULL DEFAULT 'straight_sets',
  position integer NOT NULL DEFAULT 0,
  rounds integer,
  time_cap_seconds integer,
  interval_seconds integer,
  work_seconds integer,
  rest_seconds integer,
  rest_between_rounds_seconds integer,
  prep_seconds integer DEFAULT 5,
  note text,
  CONSTRAINT plan_day_blocks_block_type_check CHECK (
    block_type IN ('warmup', 'skill', 'strength', 'metcon')
  ),
  CONSTRAINT plan_day_blocks_format_check CHECK (
    format IN ('straight_sets', 'superset', 'circuit', 'emom', 'amrap', 'for_time')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS plan_day_blocks_day_block_type_idx
  ON public.plan_day_blocks (plan_day_id, block_type);

CREATE INDEX IF NOT EXISTS plan_day_blocks_plan_day_id_idx
  ON public.plan_day_blocks (plan_day_id);

-- Table may already exist from an earlier migration without MetCon timer columns
ALTER TABLE public.plan_day_blocks
  ADD COLUMN IF NOT EXISTS work_seconds integer,
  ADD COLUMN IF NOT EXISTS rest_seconds integer,
  ADD COLUMN IF NOT EXISTS rest_between_rounds_seconds integer,
  ADD COLUMN IF NOT EXISTS prep_seconds integer DEFAULT 5;

ALTER TABLE public.plan_day_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_day_blocks_select_own" ON public.plan_day_blocks;
CREATE POLICY "plan_day_blocks_select_own"
  ON public.plan_day_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_days pd
      JOIN public.plans p ON p.id = pd.plan_id
      WHERE pd.id = plan_day_blocks.plan_day_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "plan_day_blocks_insert_own" ON public.plan_day_blocks;
CREATE POLICY "plan_day_blocks_insert_own"
  ON public.plan_day_blocks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plan_days pd
      JOIN public.plans p ON p.id = pd.plan_id
      WHERE pd.id = plan_day_blocks.plan_day_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "plan_day_blocks_update_own" ON public.plan_day_blocks;
CREATE POLICY "plan_day_blocks_update_own"
  ON public.plan_day_blocks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_days pd
      JOIN public.plans p ON p.id = pd.plan_id
      WHERE pd.id = plan_day_blocks.plan_day_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "plan_day_blocks_delete_own" ON public.plan_day_blocks;
CREATE POLICY "plan_day_blocks_delete_own"
  ON public.plan_day_blocks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_days pd
      JOIN public.plans p ON p.id = pd.plan_id
      WHERE pd.id = plan_day_blocks.plan_day_id AND p.user_id = auth.uid()
    )
  );

-- plan_day_exercises.block_id (nullable during backfill)
ALTER TABLE public.plan_day_exercises
  ADD COLUMN IF NOT EXISTS block_id uuid REFERENCES public.plan_day_blocks (id) ON DELETE CASCADE;

-- Backfill blocks + block_id for existing plan days
DO $$
DECLARE
  day_rec RECORD;
  block_rec RECORD;
  new_block_id uuid;
BEGIN
  FOR day_rec IN SELECT DISTINCT plan_day_id FROM public.plan_day_exercises WHERE block_id IS NULL LOOP
    FOR block_rec IN
      SELECT block_type, array_agg(id ORDER BY position, id) AS ex_ids
      FROM public.plan_day_exercises
      WHERE plan_day_id = day_rec.plan_day_id
      GROUP BY block_type
    LOOP
      INSERT INTO public.plan_day_blocks (plan_day_id, block_type, format, position)
      VALUES (
        day_rec.plan_day_id,
        block_rec.block_type,
        CASE
          WHEN block_rec.block_type = 'metcon' THEN 'amrap'
          ELSE 'straight_sets'
        END,
        CASE block_rec.block_type
          WHEN 'warmup' THEN 0
          WHEN 'skill' THEN 1
          WHEN 'strength' THEN 2
          WHEN 'metcon' THEN 3
          ELSE 2
        END
      )
      ON CONFLICT (plan_day_id, block_type) DO UPDATE SET block_type = EXCLUDED.block_type
      RETURNING id INTO new_block_id;

      IF new_block_id IS NULL THEN
        SELECT id INTO new_block_id
        FROM public.plan_day_blocks
        WHERE plan_day_id = day_rec.plan_day_id AND block_type = block_rec.block_type;
      END IF;

      UPDATE public.plan_day_exercises
      SET block_id = new_block_id
      WHERE id = ANY (block_rec.ex_ids);
    END LOOP;
  END LOOP;
END $$;

-- Enforce NOT NULL after backfill
ALTER TABLE public.plan_day_exercises
  ALTER COLUMN block_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS plan_day_exercises_block_id_idx
  ON public.plan_day_exercises (block_id);

-- Session MetCon score snapshot
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS metcon_results jsonb NOT NULL DEFAULT '{}'::jsonb;

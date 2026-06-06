-- 4-Bausteine-System: Warm-up, Skill, Kraft, MetCon

-- ---------------------------------------------------------------------------
-- plan_days: which blocks are active per day
-- ---------------------------------------------------------------------------
ALTER TABLE public.plan_days
  ADD COLUMN IF NOT EXISTS enabled_blocks text[] NOT NULL DEFAULT '{warmup,skill,strength,metcon}'::text[];

ALTER TABLE public.plan_days
  DROP CONSTRAINT IF EXISTS plan_days_enabled_blocks_check;

ALTER TABLE public.plan_days
  ADD CONSTRAINT plan_days_enabled_blocks_check CHECK (
    cardinality(enabled_blocks) >= 1
    AND enabled_blocks <@ ARRAY['warmup', 'skill', 'strength', 'metcon']::text[]
  );

-- ---------------------------------------------------------------------------
-- plan_day_exercises: block assignment + position per block
-- ---------------------------------------------------------------------------
ALTER TABLE public.plan_day_exercises
  ADD COLUMN IF NOT EXISTS block_type text NOT NULL DEFAULT 'strength';

ALTER TABLE public.plan_day_exercises
  DROP CONSTRAINT IF EXISTS plan_day_exercises_block_type_check;

ALTER TABLE public.plan_day_exercises
  ADD CONSTRAINT plan_day_exercises_block_type_check CHECK (
    block_type IN ('warmup', 'skill', 'strength', 'metcon')
  );

DROP INDEX IF EXISTS public.plan_day_exercises_day_position_idx;

CREATE UNIQUE INDEX IF NOT EXISTS plan_day_exercises_day_block_position_idx
  ON public.plan_day_exercises (plan_day_id, block_type, position);

-- Migrate cardio warm-up exercises to warmup block
UPDATE public.plan_day_exercises pde
SET block_type = 'warmup'
WHERE pde.block_type = 'strength'
  AND pde.metric_type = 'time'
  AND (
    lower(pde.name) LIKE '%warm%'
    OR lower(pde.name) LIKE '%aufwär%'
    OR lower(pde.name) LIKE '%mobil%'
    OR lower(pde.note) LIKE '%warm%'
    OR lower(pde.note) LIKE '%leicht%'
  );

-- Re-index positions within each block per day
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY plan_day_id, block_type
      ORDER BY position, id
    ) - 1 AS new_position
  FROM public.plan_day_exercises
)
UPDATE public.plan_day_exercises pde
SET position = ranked.new_position
FROM ranked
WHERE pde.id = ranked.id;

-- ---------------------------------------------------------------------------
-- session_exercises: block snapshot
-- ---------------------------------------------------------------------------
ALTER TABLE public.session_exercises
  ADD COLUMN IF NOT EXISTS block_type text;

ALTER TABLE public.session_exercises
  DROP CONSTRAINT IF EXISTS session_exercises_block_type_check;

ALTER TABLE public.session_exercises
  ADD CONSTRAINT session_exercises_block_type_check CHECK (
    block_type IS NULL
    OR block_type IN ('warmup', 'skill', 'strength', 'metcon')
  );

-- ---------------------------------------------------------------------------
-- sessions: skipped blocks for this session only
-- ---------------------------------------------------------------------------
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS skipped_blocks text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_skipped_blocks_check;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_skipped_blocks_check CHECK (
    skipped_blocks <@ ARRAY['warmup', 'skill', 'strength', 'metcon']::text[]
  );

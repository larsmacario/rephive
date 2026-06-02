-- Expand metric_type to 8 categories; migrate legacy `reps` (was weight+reps) to weight_reps

ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_metric_type_check;
ALTER TABLE public.workout_exercises DROP CONSTRAINT IF EXISTS workout_exercises_metric_type_check;
ALTER TABLE public.session_exercises DROP CONSTRAINT IF EXISTS session_exercises_metric_type_check;

UPDATE public.exercises SET metric_type = 'weight_reps' WHERE metric_type = 'reps';
UPDATE public.workout_exercises SET metric_type = 'weight_reps' WHERE metric_type = 'reps';
UPDATE public.session_exercises SET metric_type = 'weight_reps' WHERE metric_type = 'reps';

ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_metric_type_check CHECK (
    metric_type IN (
      'weight_reps',
      'weight_time',
      'weight_reps_time',
      'assisted_bodyweight_reps',
      'reps',
      'reps_time',
      'distance_time',
      'time'
    )
  );

ALTER TABLE public.workout_exercises
  ADD CONSTRAINT workout_exercises_metric_type_check CHECK (
    metric_type IN (
      'weight_reps',
      'weight_time',
      'weight_reps_time',
      'assisted_bodyweight_reps',
      'reps',
      'reps_time',
      'distance_time',
      'time'
    )
  );

ALTER TABLE public.session_exercises
  ADD CONSTRAINT session_exercises_metric_type_check CHECK (
    metric_type IN (
      'weight_reps',
      'weight_time',
      'weight_reps_time',
      'assisted_bodyweight_reps',
      'reps',
      'reps_time',
      'distance_time',
      'time'
    )
  );

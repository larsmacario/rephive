-- Extend body measurements table to include advanced metrics
ALTER TABLE public.body_measurements
  ADD COLUMN IF NOT EXISTS muscle_mass_kg numeric,
  ADD COLUMN IF NOT EXISTS water_pct numeric,
  ADD COLUMN IF NOT EXISTS chest_cm numeric,
  ADD COLUMN IF NOT EXISTS shoulders_cm numeric,
  ADD COLUMN IF NOT EXISTS upper_arm_l_cm numeric,
  ADD COLUMN IF NOT EXISTS upper_arm_r_cm numeric,
  ADD COLUMN IF NOT EXISTS lower_arm_l_cm numeric,
  ADD COLUMN IF NOT EXISTS lower_arm_r_cm numeric,
  ADD COLUMN IF NOT EXISTS thigh_l_cm numeric,
  ADD COLUMN IF NOT EXISTS thigh_r_cm numeric,
  ADD COLUMN IF NOT EXISTS calf_l_cm numeric,
  ADD COLUMN IF NOT EXISTS calf_r_cm numeric,
  ADD COLUMN IF NOT EXISTS hips_cm numeric;

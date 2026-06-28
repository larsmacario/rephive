-- Extend protein_logs for product-based logging
ALTER TABLE public.protein_logs
  ADD COLUMN IF NOT EXISTS ean text REFERENCES public.food_products (ean) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS amount_g numeric CHECK (amount_g IS NULL OR (amount_g > 0 AND amount_g <= 5000));

ALTER TABLE public.protein_logs DROP CONSTRAINT IF EXISTS protein_logs_source_check;
ALTER TABLE public.protein_logs
  ADD CONSTRAINT protein_logs_source_check
  CHECK (source IN ('quick', 'manual', 'post_workout', 'barcode', 'photo'));

CREATE INDEX IF NOT EXISTS protein_logs_ean_idx ON public.protein_logs (ean);

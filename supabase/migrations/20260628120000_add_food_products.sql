-- Shared food product catalog keyed by EAN
CREATE TABLE IF NOT EXISTS public.food_products (
  ean text PRIMARY KEY,
  name text NOT NULL,
  protein_per_100g numeric NOT NULL CHECK (protein_per_100g > 0 AND protein_per_100g <= 100),
  carbs_per_100g numeric CHECK (carbs_per_100g IS NULL OR (carbs_per_100g >= 0 AND carbs_per_100g <= 100)),
  fat_per_100g numeric CHECK (fat_per_100g IS NULL OR (fat_per_100g >= 0 AND fat_per_100g <= 100)),
  kcal_per_100g numeric CHECK (kcal_per_100g IS NULL OR (kcal_per_100g >= 0 AND kcal_per_100g <= 1000)),
  serving_g numeric CHECK (serving_g IS NULL OR (serving_g > 0 AND serving_g <= 2000)),
  basis text NOT NULL DEFAULT 'per_100g' CHECK (basis IN ('per_100g', 'per_serving')),
  source text NOT NULL CHECK (source IN ('user_photo', 'manual')),
  verified boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS food_products_name_idx ON public.food_products (name);

ALTER TABLE public.food_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "food_products_select_authenticated" ON public.food_products;
CREATE POLICY "food_products_select_authenticated"
  ON public.food_products FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "food_products_insert_own" ON public.food_products;
CREATE POLICY "food_products_insert_own"
  ON public.food_products FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "food_products_update_own" ON public.food_products;
CREATE POLICY "food_products_update_own"
  ON public.food_products FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "food_products_delete_own" ON public.food_products;
CREATE POLICY "food_products_delete_own"
  ON public.food_products FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Create body photos table
CREATE TABLE IF NOT EXISTS public.body_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE NOT NULL,
  photo_path text NOT NULL,
  orientation text NOT NULL CHECK (orientation IN ('front', 'back', 'side')),
  weight_kg numeric,
  performed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexing for fast search per user and date sorting
CREATE INDEX IF NOT EXISTS body_photos_user_id_idx ON public.body_photos (user_id);
CREATE INDEX IF NOT EXISTS body_photos_performed_at_idx ON public.body_photos (performed_at);

-- Enable RLS on body_photos
ALTER TABLE public.body_photos ENABLE ROW LEVEL SECURITY;

-- Select policy
DROP POLICY IF EXISTS "body_photos_select_own" ON public.body_photos;
CREATE POLICY "body_photos_select_own"
  ON public.body_photos FOR SELECT
  USING (user_id = auth.uid());

-- Insert policy
DROP POLICY IF EXISTS "body_photos_insert_own" ON public.body_photos;
CREATE POLICY "body_photos_insert_own"
  ON public.body_photos FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Update policy
DROP POLICY IF EXISTS "body_photos_update_own" ON public.body_photos;
CREATE POLICY "body_photos_update_own"
  ON public.body_photos FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Delete policy
DROP POLICY IF EXISTS "body_photos_delete_own" ON public.body_photos;
CREATE POLICY "body_photos_delete_own"
  ON public.body_photos FOR DELETE
  USING (user_id = auth.uid());

-- Create body-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('body-photos', 'body-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for body-photos bucket
DROP POLICY IF EXISTS "Allow authenticated users to read own body photos" ON storage.objects;
CREATE POLICY "Allow authenticated users to read own body photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'body-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Allow authenticated users to upload own body photos" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload own body photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'body-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Allow authenticated users to delete own body photos" ON storage.objects;
CREATE POLICY "Allow authenticated users to delete own body photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'body-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

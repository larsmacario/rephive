-- Profile avatar path on profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_path text NULL;

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for avatars bucket
DROP POLICY IF EXISTS "Allow authenticated users to read own avatars" ON storage.objects;
CREATE POLICY "Allow authenticated users to read own avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Allow authenticated users to upload own avatars" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload own avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Allow authenticated users to update own avatars" ON storage.objects;
CREATE POLICY "Allow authenticated users to update own avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Allow authenticated users to delete own avatars" ON storage.objects;
CREATE POLICY "Allow authenticated users to delete own avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

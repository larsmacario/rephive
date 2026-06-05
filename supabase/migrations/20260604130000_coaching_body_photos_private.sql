-- Harden body-photos bucket: private + coach RLS already in coaching migration

UPDATE storage.buckets
SET public = false
WHERE id = 'body-photos';

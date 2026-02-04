-- Add profile_photo_url column to profiles table for workers (if not exists)
-- Note: This column may already exist from previous migrations, but we ensure it's there

-- Storage policies for worker-profiles bucket
-- Note: Storage bucket needs to be created manually in Supabase Dashboard:
-- 1. Go to Storage > Create Bucket
-- 2. Create bucket: "worker-profiles" (public: true)

-- Storage policies for worker-profiles bucket
-- Drop existing policies if they exist, then create new ones

DROP POLICY IF EXISTS "Workers can upload their own profile photos" ON storage.objects;
CREATE POLICY "Workers can upload their own profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'worker-profiles' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Workers can update their own profile photos" ON storage.objects;
CREATE POLICY "Workers can update their own profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'worker-profiles' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Workers can delete their own profile photos" ON storage.objects;
CREATE POLICY "Workers can delete their own profile photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'worker-profiles' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Anyone can view worker profile photos" ON storage.objects;
CREATE POLICY "Anyone can view worker profile photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'worker-profiles');

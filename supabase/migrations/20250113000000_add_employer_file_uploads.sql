-- Add CV URL column to profiles table for employers
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS cv_url TEXT;

-- Note: Storage buckets need to be created manually in Supabase Dashboard:
-- 1. Go to Storage > Create Bucket
-- 2. Create bucket: "employer-profiles" (public: true)
-- 3. Create bucket: "employer-documents" (public: false)

-- Storage policies for employer-profiles bucket
-- These policies allow employers to upload/update/delete their own profile photos
-- and allow anyone to view them (public bucket)

CREATE POLICY IF NOT EXISTS "Employers can upload their own profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employer-profiles' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY IF NOT EXISTS "Employers can update their own profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'employer-profiles' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY IF NOT EXISTS "Employers can delete their own profile photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'employer-profiles' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY IF NOT EXISTS "Anyone can view profile photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'employer-profiles');

-- Storage policies for employer-documents bucket
-- These policies allow employers to upload/update/delete their own documents
-- and only view their own documents (private bucket)

CREATE POLICY IF NOT EXISTS "Employers can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employer-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY IF NOT EXISTS "Employers can update their own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'employer-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY IF NOT EXISTS "Employers can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'employer-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY IF NOT EXISTS "Employers can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'employer-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

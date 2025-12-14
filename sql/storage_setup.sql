-- Supabase Storage Setup for Flat Images
-- Run this in Supabase Dashboard → Storage → Create Bucket

-- Note: Create bucket via UI first, then run these policies

-- 1. Create bucket "flat-images" via Supabase Dashboard → Storage
-- Settings: Public bucket = false (private)

-- 2. Apply these storage policies:

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload flat images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'flat-images');

-- Allow authenticated users to view flat images
CREATE POLICY "Authenticated users can view flat images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'flat-images');

-- Allow authenticated users to delete their uploaded images
CREATE POLICY "Authenticated users can delete flat images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'flat-images');

-- Allow authenticated users to update image metadata
CREATE POLICY "Authenticated users can update flat images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'flat-images');

-- Storage path structure: flat-images/{flat_id}/{timestamp}_{filename}
-- Example: flat-images/123e4567-e89b-12d3-a456-426614174000/1702540800000_bathroom.jpg

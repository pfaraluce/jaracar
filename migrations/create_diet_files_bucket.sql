-- Create diet-files bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'diet-files',
    'diet-files',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = true; -- Ensure it is public

-- Ensure Policy for Public Access (Reading)
DROP POLICY IF EXISTS "Public Access to Diet Files" ON storage.objects;
CREATE POLICY "Public Access to Diet Files" ON storage.objects FOR SELECT
USING ( bucket_id = 'diet-files' );

-- Ensure Policy for Authenticated Uploads
DROP POLICY IF EXISTS "Authenticated Users Can Upload Diet Files" ON storage.objects;
CREATE POLICY "Authenticated Users Can Upload Diet Files" ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'diet-files' AND
    auth.role() = 'authenticated'
);

-- Ensure Policy for Deletion (Owners)
DROP POLICY IF EXISTS "Users Can Delete Own Diet Files" ON storage.objects;
CREATE POLICY "Users Can Delete Own Diet Files" ON storage.objects FOR DELETE
USING (
    bucket_id = 'diet-files' AND
    auth.uid() = owner
);

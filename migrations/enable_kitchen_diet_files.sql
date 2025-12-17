-- Enable Kitchen Role to view Diet Files

-- 1. Grant SELECT permission on diet_files table to KITCHEN and ADMIN roles
DROP POLICY IF EXISTS "Kitchen and Admin can view diet files" ON diet_files;

CREATE POLICY "Kitchen and Admin can view diet files" ON diet_files FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ADMIN', 'KITCHEN')
  )
);

-- Ensure authenticated users can still upload their own files (existing policies should cover this, but reinforcing)
-- The existing policy is likely "Users can view own files" and "Users can upload own files".
-- We just added the Kitchen/Admin view policy.

-- 2. Storage Permissions (if applicable)
-- Assuming storage permissions are handled via bucket policies that check auth.uid or rely on RLS if using helper functions.
-- If storage policies are restrictive, we might need to add one.
-- Common pattern: "Give access to files in folder matching user_id".
-- For diet-files bucket, if we want Kitchen to view ALL files, we need a policy like:

-- (This part depends on if you use Supabase Storage policies directly)
-- Attempting to add a broad read policy for Kitchen/Admin on 'diet-files' bucket objects.

-- Verify if 'diet-files' bucket exists, if not create it (safe guard)
insert into storage.buckets (id, name, public)
values ('diet-files', 'diet-files', true)
on conflict (id) do nothing;

-- Policy: Kitchen and Admin can SELECT all objects in diet-files
-- construct policy name carefully
BEGIN;
  DROP POLICY IF EXISTS "Kitchen and Admin View All Diet Files" ON storage.objects;
  
  CREATE POLICY "Kitchen and Admin View All Diet Files" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'diet-files' AND
    (
      auth.role() = 'authenticated' AND 
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('ADMIN', 'KITCHEN')
      )
    )
  );
COMMIT;

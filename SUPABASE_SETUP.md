# Supabase Setup Instructions

## 1. Run Database Migration

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `migrations/add_profile_fields.sql`
5. Click **Run** to execute the migration
6. Verify success - you should see:
   - New columns in `profiles` table
   - New `diet_files` table
   - New `assign_diet_number()` function
   - New trigger `trigger_assign_diet_number`

## 2. Create Storage Bucket

1. Navigate to **Storage** in Supabase dashboard
2. Click **New bucket**
3. Configure the bucket:
   - **Name**: `diet-files`
   - **Public**: ❌ **OFF** (keep it private)
   - **File size limit**: 10 MB (or as needed)
   - **Allowed MIME types**: Leave empty for all types
4. Click **Create bucket**

## 3. Configure Storage RLS Policies

After creating the bucket, add these policies:

### Policy 1: Upload Own Files
```sql
CREATE POLICY "Users can upload own diet files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'diet-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 2: View Own Files
```sql
CREATE POLICY "Users can view own diet files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'diet-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 3: Delete Own Files
```sql
CREATE POLICY "Users can delete own diet files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'diet-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## 4. Verify Setup

Test the implementation:

1. **Create a test user** via the invitation flow
2. **Fill in profile fields**:
   - Add birthday
   - Add initials (e.g., "ABC")
   - Enable diet toggle
   - Add diet name and notes
3. **Upload a test file** (PDF or image)
4. **Check database**:
   - Verify `diet_number` was assigned (should be 1 for first user)
   - Verify `diet_files` table has the file record
5. **Test file deletion**
6. **Test diet number reuse**:
   - Disable diet for first user
   - Create second user with diet
   - Verify second user gets number 1 (reused)

## Troubleshooting

### Migration Errors
- If you get "column already exists" errors, the migration was partially run
- Check which columns exist and comment out those parts
- Or drop the columns and re-run

### Storage Upload Errors
- Verify bucket is created and named exactly `diet-files`
- Check RLS policies are applied correctly
- Ensure user is authenticated

### Diet Number Not Assigned
- Check trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_assign_diet_number';`
- Verify function exists: `SELECT * FROM pg_proc WHERE proname = 'assign_diet_number';`
- Test manually: `UPDATE profiles SET has_diet = true WHERE id = 'user-id';`

## Notes

- The `avatars` bucket should already exist from previous setup
- Diet numbers start at 1 and increment
- When a user disables diet, their number becomes available for reuse
- Files are stored in user-specific folders: `{user_id}/{timestamp}_{filename}`

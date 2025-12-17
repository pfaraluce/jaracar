-- Add new fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS initials TEXT,
ADD COLUMN IF NOT EXISTS has_diet BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS diet_number INTEGER,
ADD COLUMN IF NOT EXISTS diet_name TEXT,
ADD COLUMN IF NOT EXISTS diet_notes TEXT;

-- Create diet_files table for file attachments
CREATE TABLE IF NOT EXISTS diet_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for diet_files
ALTER TABLE diet_files ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own diet files
CREATE POLICY "Users can view own diet files"
  ON diet_files FOR SELECT
  USING (auth.uid()::uuid = user_id);

-- Policy: Users can insert their own diet files
CREATE POLICY "Users can insert own diet files"
  ON diet_files FOR INSERT
  WITH CHECK (auth.uid()::uuid = user_id);

-- Policy: Users can update their own diet files
CREATE POLICY "Users can update own diet files"
  ON diet_files FOR UPDATE
  USING (auth.uid()::uuid = user_id);

-- Policy: Users can delete their own diet files
CREATE POLICY "Users can delete own diet files"
  ON diet_files FOR DELETE
  USING (auth.uid()::uuid = user_id);

-- Function to assign the lowest available diet number
CREATE OR REPLACE FUNCTION assign_diet_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Only assign if has_diet is being set to true and diet_number is null
  IF NEW.has_diet = TRUE AND (OLD.has_diet IS NULL OR OLD.has_diet = FALSE) THEN
    -- Find the lowest available number
    -- First, try to find a gap in the sequence
    SELECT COALESCE(
      (
        SELECT MIN(t1.diet_number + 1)
        FROM profiles t1
        WHERE t1.has_diet = TRUE 
          AND t1.diet_number IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 
            FROM profiles t2 
            WHERE t2.has_diet = TRUE 
              AND t2.diet_number = t1.diet_number + 1
          )
          AND t1.diet_number + 1 NOT IN (
            SELECT diet_number 
            FROM profiles 
            WHERE has_diet = TRUE AND diet_number IS NOT NULL
          )
      ),
      -- If no gap found, get max + 1, or 1 if no diets exist
      (
        SELECT COALESCE(MAX(diet_number), 0) + 1
        FROM profiles
        WHERE has_diet = TRUE AND diet_number IS NOT NULL
      )
    ) INTO next_number;
    
    -- Assign the number
    NEW.diet_number := next_number;
  ELSIF NEW.has_diet = FALSE THEN
    -- If diet is disabled, clear the diet number and related fields
    NEW.diet_number := NULL;
    NEW.diet_name := NULL;
    NEW.diet_notes := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic diet number assignment
DROP TRIGGER IF EXISTS trigger_assign_diet_number ON profiles;
CREATE TRIGGER trigger_assign_diet_number
  BEFORE INSERT OR UPDATE OF has_diet ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_diet_number();

-- Add index for better performance on diet number queries
CREATE INDEX IF NOT EXISTS idx_profiles_diet_number ON profiles(diet_number) WHERE has_diet = TRUE;
CREATE INDEX IF NOT EXISTS idx_diet_files_user_id ON diet_files(user_id);

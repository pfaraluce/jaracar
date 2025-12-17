-- Fix RLS policies for diet_files table
-- Run this in Supabase SQL Editor to fix the upload error

-- First, drop existing policies
DROP POLICY IF EXISTS "Users can view own diet files" ON diet_files;
DROP POLICY IF EXISTS "Users can insert own diet files" ON diet_files;
DROP POLICY IF EXISTS "Users can update own diet files" ON diet_files;
DROP POLICY IF EXISTS "Users can delete own diet files" ON diet_files;

-- Recreate policies with proper UUID casting
CREATE POLICY "Users can view own diet files"
  ON diet_files FOR SELECT
  USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can insert own diet files"
  ON diet_files FOR INSERT
  WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can update own diet files"
  ON diet_files FOR UPDATE
  USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can delete own diet files"
  ON diet_files FOR DELETE
  USING (auth.uid()::uuid = user_id);

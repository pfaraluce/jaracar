-- Add receiver_id column
ALTER TABLE user_admin_messages
ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES profiles(id);

-- Enable RLS (just in case)
ALTER TABLE user_admin_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to redefine them
DROP POLICY IF EXISTS "Users can view their own messages" ON user_admin_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON user_admin_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON user_admin_messages;
DROP POLICY IF EXISTS "Admins can insert messages" ON user_admin_messages;
DROP POLICY IF EXISTS "Unified message access policy" ON user_admin_messages;

-- Create a unified policy for SELECT
CREATE POLICY "Unified message access policy" ON user_admin_messages
FOR SELECT USING (
  -- User is the "owner" of the conversation (user_id)
  auth.uid() = user_id
  -- User is the sender
  OR auth.uid() = sender_id
  -- User is the receiver
  OR auth.uid() = receiver_id
  -- Message is global
  OR is_global = true
  -- Legacy/Broadcast support: If receiver_id is NULL, Admins can view
  OR (receiver_id IS NULL AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'
  ))
);

-- Policy for INSERT
CREATE POLICY "Unified message insert policy" ON user_admin_messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);

-- Policy for UPDATE (e.g. marking as read, or soft delete)
CREATE POLICY "Unified message update policy" ON user_admin_messages
FOR UPDATE USING (
  auth.uid() = sender_id 
  OR auth.uid() = receiver_id
  OR (receiver_id IS NULL AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'
  ))
);

-- Policy for DELETE
CREATE POLICY "Unified message delete policy" ON user_admin_messages
FOR DELETE USING (
  auth.uid() = sender_id 
  -- Admins can delete any message in legacy threads or their own threads?
  -- For now, let's stick to sender can delete or receiver can delete?
  -- Implementation uses Soft Delete for users, Hard Delete for admins.
  -- Admin hard delete:
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'
  )
);

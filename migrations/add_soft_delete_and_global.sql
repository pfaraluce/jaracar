-- Add columns for soft delete and global broadcast tracking
ALTER TABLE user_admin_messages 
ADD COLUMN IF NOT EXISTS deleted_by_user BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE;

-- Create an index to speed up filtering by deleted status
CREATE INDEX IF NOT EXISTS idx_user_admin_messages_deleted_by_user ON user_admin_messages(deleted_by_user);

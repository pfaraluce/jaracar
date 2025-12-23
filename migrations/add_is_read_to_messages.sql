-- Migration: Add is_read to user_admin_messages
ALTER TABLE user_admin_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_admin_messages_is_read ON user_admin_messages(is_read);

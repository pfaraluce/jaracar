-- Add global_enabled column to user_notification_preferences
ALTER TABLE user_notification_preferences 
ADD COLUMN IF NOT EXISTS global_enabled BOOLEAN DEFAULT true;

-- Update existing records to have global_enabled = true (optional as default handles new ones)
UPDATE user_notification_preferences 
SET global_enabled = true 
WHERE global_enabled IS NULL;

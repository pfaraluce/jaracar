-- Add tasks_maintenance_mode column to house_settings
ALTER TABLE house_settings ADD COLUMN IF NOT EXISTS tasks_maintenance_mode BOOLEAN DEFAULT FALSE;

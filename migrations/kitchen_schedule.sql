-- Migration to support Weekly Schedule for Kitchen Cutoffs
-- and ensure Guest Options are robust.

-- 1. Update kitchen_config to use a schedule approach
-- We drop the specific columns (breakfast_cutoff_time, etc) in favor of a flexible structure or specific weekday columns.
-- JSONB is most flexible for "Day of Week" mapping.
-- Structure: { "1": "10:00", "2": "10:30", ... } where 0=Sunday, 1=Monday...

ALTER TABLE kitchen_config 
ADD COLUMN IF NOT EXISTS weekly_schedule JSONB DEFAULT '{}'::jsonb,
DROP COLUMN IF EXISTS breakfast_cutoff_time,
DROP COLUMN IF EXISTS lunch_cutoff_time,
DROP COLUMN IF EXISTS dinner_cutoff_time;

-- 2. Ensure meal_guests has the correct option constraints/defaults if needed
-- (It was already added in previous migration, but good to ensure default)
-- No changes needed if previous migration ran.

-- 3. We might want a "lock_time" in daily_meal_status to know WHEN it was locked, 
-- but we already have locked_at.

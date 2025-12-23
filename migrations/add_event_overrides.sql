-- Add description_override to calendar_events
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS description_override TEXT;

-- Add a unique constraint if it doesn't exist to allow upserts safely
-- (calendar_id, external_uid) identifies a unique event within a calendar
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_events_calendar_id_external_uid_key') THEN
        ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_calendar_id_external_uid_key UNIQUE (calendar_id, external_uid);
    END IF;
END $$;

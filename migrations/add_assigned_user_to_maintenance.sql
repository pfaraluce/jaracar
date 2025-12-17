-- Add assigned_user_id column to maintenance_tickets table
-- This allows admins to assign tickets to specific users

-- First, add the column if it doesn't exist
ALTER TABLE maintenance_tickets
ADD COLUMN IF NOT EXISTS assigned_user_id UUID;

-- Add foreign key constraint for assigned_user_id
ALTER TABLE maintenance_tickets
DROP CONSTRAINT IF EXISTS fk_maintenance_assigned_user;

ALTER TABLE maintenance_tickets
ADD CONSTRAINT fk_maintenance_assigned_user 
FOREIGN KEY (assigned_user_id) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- Also ensure reporter_id has a proper foreign key constraint
ALTER TABLE maintenance_tickets
DROP CONSTRAINT IF EXISTS fk_maintenance_reporter;

ALTER TABLE maintenance_tickets
ADD CONSTRAINT fk_maintenance_reporter 
FOREIGN KEY (reporter_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_assigned_user 
ON maintenance_tickets(assigned_user_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_reporter 
ON maintenance_tickets(reporter_id);

-- Add comments to document the columns
COMMENT ON COLUMN maintenance_tickets.assigned_user_id IS 
'User assigned to handle this maintenance ticket. Can be different from reporter_id.';

COMMENT ON COLUMN maintenance_tickets.reporter_id IS 
'User who created/reported this maintenance ticket.';

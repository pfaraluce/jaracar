-- Migration: Add guest reservation fields
-- Description: Adds optional fields to support reservations for external guests
-- Execute this in your Supabase SQL Editor

-- Add guest fields to reservations table
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS is_for_guest BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS guest_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN reservations.is_for_guest IS 'Indicates if this reservation is for an external guest (not the resident who booked)';
COMMENT ON COLUMN reservations.guest_name IS 'Name of the guest driver when is_for_guest is true';

-- Create index for faster guest name lookups (for autocomplete)
CREATE INDEX IF NOT EXISTS idx_reservations_guest_name 
ON reservations(guest_name) 
WHERE is_for_guest = true AND guest_name IS NOT NULL;

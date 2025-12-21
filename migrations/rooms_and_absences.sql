-- Room and Absence Management System
-- This migration creates tables for room management and user absences

-- ============================================
-- ROOMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    total_beds INTEGER NOT NULL CHECK (total_beds > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROOM BEDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS room_beds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    bed_number INTEGER NOT NULL,
    assigned_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, bed_number)
);

-- ============================================
-- USER ABSENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_absences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

-- ============================================
-- UPDATE PROFILES TABLE
-- ============================================
-- Add room and bed reference fields to profiles for quick lookup
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS bed_id UUID REFERENCES room_beds(id) ON DELETE SET NULL;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_room_beds_room_id ON room_beds(room_id);
CREATE INDEX IF NOT EXISTS idx_room_beds_assigned_user ON room_beds(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_user_absences_user_id ON user_absences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_absences_dates ON user_absences(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_profiles_room_id ON profiles(room_id);
CREATE INDEX IF NOT EXISTS idx_profiles_bed_id ON profiles(bed_id);

-- ============================================
-- RLS POLICIES - ROOMS
-- ============================================
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view rooms
CREATE POLICY "Authenticated users can view rooms"
ON rooms FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert rooms
CREATE POLICY "Admins can insert rooms"
ON rooms FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'ADMIN'
    )
);

-- Only admins can update rooms
CREATE POLICY "Admins can update rooms"
ON rooms FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'ADMIN'
    )
);

-- Only admins can delete rooms
CREATE POLICY "Admins can delete rooms"
ON rooms FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'ADMIN'
    )
);

-- ============================================
-- RLS POLICIES - ROOM BEDS
-- ============================================
ALTER TABLE room_beds ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view beds
CREATE POLICY "Authenticated users can view beds"
ON room_beds FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert beds
CREATE POLICY "Admins can insert beds"
ON room_beds FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'ADMIN'
    )
);

-- Only admins can update beds
CREATE POLICY "Admins can update beds"
ON room_beds FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'ADMIN'
    )
);

-- Only admins can delete beds
CREATE POLICY "Admins can delete beds"
ON room_beds FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'ADMIN'
    )
);

-- ============================================
-- RLS POLICIES - USER ABSENCES
-- ============================================
ALTER TABLE user_absences ENABLE ROW LEVEL SECURITY;

-- Users can view their own absences, admins can view all
CREATE POLICY "Users can view own absences, admins view all"
ON user_absences FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'ADMIN'
    )
);

-- Users can insert their own absences
CREATE POLICY "Users can insert own absences"
ON user_absences FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own absences
CREATE POLICY "Users can update own absences"
ON user_absences FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Users can delete their own absences
CREATE POLICY "Users can delete own absences"
ON user_absences FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp for rooms
CREATE OR REPLACE FUNCTION update_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rooms_updated_at
BEFORE UPDATE ON rooms
FOR EACH ROW
EXECUTE FUNCTION update_rooms_updated_at();

-- Update updated_at timestamp for room_beds
CREATE OR REPLACE FUNCTION update_room_beds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_room_beds_updated_at
BEFORE UPDATE ON room_beds
FOR EACH ROW
EXECUTE FUNCTION update_room_beds_updated_at();

-- Update updated_at timestamp for user_absences
CREATE OR REPLACE FUNCTION update_user_absences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_absences_updated_at
BEFORE UPDATE ON user_absences
FOR EACH ROW
EXECUTE FUNCTION update_user_absences_updated_at();

-- Sync profile room/bed fields when bed assignment changes
CREATE OR REPLACE FUNCTION sync_profile_room_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the assigned user's profile
    IF NEW.assigned_user_id IS NOT NULL THEN
        UPDATE profiles
        SET room_id = NEW.room_id,
            bed_id = NEW.id
        WHERE id = NEW.assigned_user_id;
    END IF;
    
    -- Clear old user's profile if changed
    IF OLD.assigned_user_id IS NOT NULL AND OLD.assigned_user_id != NEW.assigned_user_id THEN
        UPDATE profiles
        SET room_id = NULL,
            bed_id = NULL
        WHERE id = OLD.assigned_user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_profile_room_assignment
AFTER UPDATE OF assigned_user_id ON room_beds
FOR EACH ROW
EXECUTE FUNCTION sync_profile_room_assignment();

-- Clear profile room/bed when bed is deleted
CREATE OR REPLACE FUNCTION clear_profile_on_bed_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.assigned_user_id IS NOT NULL THEN
        UPDATE profiles
        SET room_id = NULL,
            bed_id = NULL
        WHERE id = OLD.assigned_user_id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_clear_profile_on_bed_delete
BEFORE DELETE ON room_beds
FOR EACH ROW
EXECUTE FUNCTION clear_profile_on_bed_delete();

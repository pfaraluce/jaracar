-- Migration: House Guide Setup

-- 1. House Settings Table (Schedules, Keys, Instructions)
CREATE TABLE IF NOT EXISTS house_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedules JSONB DEFAULT '{
        "weekdays": [],
        "saturdays": [],
        "sundays": []
    }'::jsonb,
    house_keys JSONB DEFAULT '[]'::jsonb,
    instructions TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert a default row if it doesn't exist
INSERT INTO house_settings (id) 
SELECT gen_random_uuid() 
WHERE NOT EXISTS (SELECT 1 FROM house_settings);

-- 2. House Documents Table
CREATE TABLE IF NOT EXISTS house_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. App Guide Table (Wiki)
CREATE TABLE IF NOT EXISTS app_guide (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Storage Bucket
-- (Run this manually in Supabase Dashboard or via API if possible)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('house-documents', 'house-documents', false);

-- 5. RLS Policies

-- house_settings
ALTER TABLE house_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all approved users"
ON house_settings FOR SELECT
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.status = 'APPROVED'
));

CREATE POLICY "Allow full access to admins"
ON house_settings FOR ALL
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
));

-- house_documents
ALTER TABLE house_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to approved users for documents"
ON house_documents FOR SELECT
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.status = 'APPROVED'
));

CREATE POLICY "Allow admin to manage documents"
ON house_documents FOR ALL
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
));

-- app_guide
ALTER TABLE app_guide ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to approved users for guide"
ON app_guide FOR SELECT
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.status = 'APPROVED'
));

CREATE POLICY "Allow admin to manage guide"
ON app_guide FOR ALL
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
));

-- Add trigger for updated_at in app_guide
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_app_guide_updated_at
    BEFORE UPDATE ON app_guide
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

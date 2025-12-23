-- Create user_admin_messages table
CREATE TABLE IF NOT EXISTS user_admin_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES user_admin_messages(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_admin_messages ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_admin_messages_user_id ON user_admin_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_admin_messages_parent_id ON user_admin_messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_user_admin_messages_is_completed ON user_admin_messages(is_completed);

-- Policies

-- 1. Users can see their own messages and replies to them
CREATE POLICY "Users can view own messages"
    ON user_admin_messages FOR SELECT
    USING (
        auth.uid()::uuid = user_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid()::uuid AND profiles.role = 'ADMIN'
        )
    );

-- 2. Users can insert messages in their own threads
CREATE POLICY "Users can insert own messages"
    ON user_admin_messages FOR INSERT
    WITH CHECK (
        auth.uid()::uuid = sender_id AND 
        auth.uid()::uuid = user_id
    );

-- 3. Admins can insert replies
CREATE POLICY "Admins can insert replies"
    ON user_admin_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid()::uuid AND profiles.role = 'ADMIN'
        )
    );

-- 4. Admins can update messages (to mark as completed)
CREATE POLICY "Admins can update messages"
    ON user_admin_messages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid()::uuid AND profiles.role = 'ADMIN'
        )
    );

-- 5. Admins can delete messages
CREATE POLICY "Admins can delete messages"
    ON user_admin_messages FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid()::uuid AND profiles.role = 'ADMIN'
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_admin_messages_updated_at
    BEFORE UPDATE ON user_admin_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

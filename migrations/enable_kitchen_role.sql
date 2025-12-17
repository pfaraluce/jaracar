-- Enable Kitchen Role Permissions

-- 1. MEAL ORDERS: Allow Kitchen and Admin to view ALL orders
-- Current policy might be "Users can view own orders"
DROP POLICY IF EXISTS "Users can view own orders" ON meal_orders;
DROP POLICY IF EXISTS "Users and Kitchen can view orders" ON meal_orders;

CREATE POLICY "Users and Kitchen can view orders" ON meal_orders FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ADMIN', 'KITCHEN')
  )
);

-- 2. PROFILES: Ensure authenticated users can view all profiles (needed for names/avatars/diets)
-- We remove restrictive policies if they exist and allow read for all authenticated
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

CREATE POLICY "Authenticated users can view profiles" ON profiles FOR SELECT
USING ( auth.role() = 'authenticated' );

-- 3. MEAL GUESTS: Allow Kitchen/Admin to manage, everyone to view
CREATE TABLE IF NOT EXISTS meal_guests (
    id uuid default gen_random_uuid() primary key,
    date date not null,
    meal_type text not null,
    count integer default 1,
    option text default 'standard',
    is_bag boolean default false,
    notes text,
    created_by uuid references auth.users,
    created_at timestamptz default now()
);

ALTER TABLE meal_guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view guests" ON meal_guests;
CREATE POLICY "Authenticated users can view guests" ON meal_guests FOR SELECT
USING ( auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Kitchen and Admin can manage guests" ON meal_guests;
CREATE POLICY "Kitchen and Admin can manage guests" ON meal_guests FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ADMIN', 'KITCHEN')
  )
);

-- 4. DAILY MEAL STATUS (Locks): Kitchen needs to read/write locks
-- Service uses 'daily_meal_status'
CREATE TABLE IF NOT EXISTS daily_meal_status (
    id uuid default gen_random_uuid() primary key,
    date date not null,
    meal_type text not null,
    is_locked boolean default false,
    locked_at timestamptz,
    locked_by uuid references auth.users,
    unique(date, meal_type)
);

ALTER TABLE daily_meal_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view locks" ON daily_meal_status;
CREATE POLICY "Users can view locks" ON daily_meal_status FOR SELECT
USING ( auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Kitchen and Admin can manage locks" ON daily_meal_status;
CREATE POLICY "Kitchen and Admin can manage locks" ON daily_meal_status FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ADMIN', 'KITCHEN')
  )
);

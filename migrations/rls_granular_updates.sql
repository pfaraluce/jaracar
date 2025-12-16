-- Helper Functions for Granular Permissions

-- 1. Check VIEW Access (Matches Frontend Logic: Default Allow if no permissions set)
CREATE OR REPLACE FUNCTION public.has_granular_access(user_id uuid, module_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  perms jsonb;
  role_str text;
BEGIN
  SELECT role, permissions INTO role_str, perms FROM profiles WHERE id = user_id;
  
  -- Global Admin always has access
  IF role_str = 'ADMIN' THEN RETURN true; END IF;
  
  -- Default Allow: If no permissions object (or empty), allow access
  IF perms IS NULL OR perms = '{}'::jsonb THEN RETURN true; END IF;
  
  -- Whitelist Mode: If permissions exist, ONLY allow if explicit view=true
  IF perms ? module_key THEN
    RETURN COALESCE((perms->module_key->>'view')::boolean, false);
  ELSE
    RETURN false; -- Module not present in permissions object -> Deny
  END IF;
END;
$$;

-- 2. Check ADMIN Access (Matches Frontend Logic: Explicit Grant required)
CREATE OR REPLACE FUNCTION public.has_granular_admin(user_id uuid, module_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  perms jsonb;
  role_str text;
BEGIN
  SELECT role, permissions INTO role_str, perms FROM profiles WHERE id = user_id;
  
  -- Global Admin always has access
  IF role_str = 'ADMIN' THEN RETURN true; END IF;
  
  -- Granular Admin Check
  IF perms IS NOT NULL AND perms ? module_key THEN
    RETURN COALESCE((perms->module_key->>'admin')::boolean, false);
  END IF;
  
  RETURN false;
END;
$$;

-- ==========================================
-- UPDATE RLS POLICIES
-- ==========================================

-- 1. CARS TABLE
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read access" ON cars;
DROP POLICY IF EXISTS "Write access" ON cars;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON cars;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON cars;
DROP POLICY IF EXISTS "Enable update for users based on email" ON cars;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON cars;
DROP POLICY IF EXISTS "Anyone can view cars" ON cars;
DROP POLICY IF EXISTS "Admins can manage cars" ON cars;

CREATE POLICY "Granular Read Access - Cars" ON cars FOR SELECT TO authenticated
USING (public.has_granular_access(auth.uid(), 'vehicles'));

CREATE POLICY "Granular Write Access - Cars" ON cars FOR ALL TO authenticated
USING (public.has_granular_admin(auth.uid(), 'vehicles'))
WITH CHECK (public.has_granular_admin(auth.uid(), 'vehicles'));


-- 2. MEAL TEMPLATES & ORDERS
-- Templates
DROP POLICY IF EXISTS "Users can view own templates" ON meal_templates;
DROP POLICY IF EXISTS "Users can manage own templates" ON meal_templates;

-- View: Own templates OR Admin (Granular)
CREATE POLICY "View Meal Templates" ON meal_templates FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR 
  public.has_granular_admin(auth.uid(), 'meals')
);

-- Manage: Own templates OR Admin (Granular)
CREATE POLICY "Manage Meal Templates" ON meal_templates FOR ALL TO authenticated
USING (
  user_id = auth.uid() OR 
  public.has_granular_admin(auth.uid(), 'meals')
);

-- Orders
DROP POLICY IF EXISTS "Users can view own orders" ON meal_orders;
DROP POLICY IF EXISTS "Users can manage own orders" ON meal_orders;

CREATE POLICY "View Meal Orders" ON meal_orders FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR 
  public.has_granular_admin(auth.uid(), 'meals')
);

CREATE POLICY "Manage Meal Orders" ON meal_orders FOR ALL TO authenticated
USING (
  user_id = auth.uid() OR 
  public.has_granular_admin(auth.uid(), 'meals')
);


-- 3. CALENDARS & EVENTS
-- Calendars
DROP POLICY IF EXISTS "Everyone can view calendars" ON calendars;
DROP POLICY IF EXISTS "Users can insert calendars" ON calendars;
DROP POLICY IF EXISTS "Users can delete calendars" ON calendars;

CREATE POLICY "Granular Read Access - Calendars" ON calendars FOR SELECT TO authenticated
USING (public.has_granular_access(auth.uid(), 'calendar'));

CREATE POLICY "Granular Write Access - Calendars" ON calendars FOR ALL TO authenticated
USING (public.has_granular_admin(auth.uid(), 'calendar'));

-- Events
DROP POLICY IF EXISTS "Users can view events" ON calendar_events;
DROP POLICY IF EXISTS "Users can manage events" ON calendar_events;

CREATE POLICY "Granular Read Access - Events" ON calendar_events FOR SELECT TO authenticated
USING (public.has_granular_access(auth.uid(), 'calendar'));

CREATE POLICY "Granular Write Access - Events" ON calendar_events FOR ALL TO authenticated
USING (public.has_granular_admin(auth.uid(), 'calendar'));


-- 4. MAINTENANCE TICKETS
-- View: Custom logic (View All if 'maintenance' view is allowed, else ?)
-- Actually, Maintenance is for everyone to report. So "View Access" to the module means "Can see the dashboard/list".
-- But checking tickets?
-- Let's say: View Access = Can see ALL tickets (Transparency).
-- No View Access = Can still create their own tickets? Or completely blocked?
-- Based on previous "module hidden if no permission", assume blocked. I'll stick to that.

DROP POLICY IF EXISTS "Users can view all tickets" ON maintenance_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON maintenance_tickets;
DROP POLICY IF EXISTS "Users can update own tickets" ON maintenance_tickets;

-- View: Granular Access Required to see list
CREATE POLICY "Granular Read Access - Tickets" ON maintenance_tickets FOR SELECT TO authenticated
USING (public.has_granular_access(auth.uid(), 'maintenance'));

-- Create: Granular Access Required (implies they can enter the module)
CREATE POLICY "Granular Create Access - Tickets" ON maintenance_tickets FOR INSERT TO authenticated
WITH CHECK (public.has_granular_access(auth.uid(), 'maintenance'));

-- Update: Reporter (own) OR Admin
CREATE POLICY "Granular Update Access - Tickets" ON maintenance_tickets FOR UPDATE TO authenticated
USING (
  (reporter_id = auth.uid() AND public.has_granular_access(auth.uid(), 'maintenance')) OR 
  public.has_granular_admin(auth.uid(), 'maintenance')
);

-- Delete: Admin Only
CREATE POLICY "Granular Delete Access - Tickets" ON maintenance_tickets FOR DELETE TO authenticated
USING (public.has_granular_admin(auth.uid(), 'maintenance'));

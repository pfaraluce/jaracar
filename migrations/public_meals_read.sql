-- Allow all authenticated users to view all meal orders (Public List Mode)
DROP POLICY IF EXISTS "View Meal Orders" ON meal_orders;

CREATE POLICY "View Meal Orders"
ON meal_orders FOR SELECT
TO authenticated
USING (true); -- Public read access for logged-in users

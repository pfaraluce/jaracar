-- update RLS for meal_templates to allow public read
DROP POLICY IF EXISTS "View Meal Templates" ON meal_templates;

CREATE POLICY "View Meal Templates"
ON meal_templates FOR SELECT
TO authenticated
USING (true); -- Public read access for logged-in users to calculate effective plans

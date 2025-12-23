-- Migration: Add bag_time to meal_orders

ALTER TABLE meal_orders
ADD COLUMN IF NOT EXISTS bag_time TEXT; -- Format "HH:mm"

-- Optional: Add comment
COMMENT ON COLUMN meal_orders.bag_time IS 'Pickup time for the bag (e.g., "14:00")';

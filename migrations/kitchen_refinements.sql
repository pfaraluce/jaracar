-- Add Daily Meal Status table for Manual Locking
create table if not exists daily_meal_status (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  meal_type text not null, -- 'breakfast', 'lunch', 'dinner'
  is_locked boolean default false,
  locked_at timestamptz,
  locked_by uuid references auth.users(id),
  unique(date, meal_type)
);

alter table daily_meal_status enable row level security;

-- Everyone can view status (to know if locked)
create policy "Everyone can view daily status"
  on daily_meal_status for select
  using (auth.role() = 'authenticated');

-- Only Admins can update/insert
create policy "Admins can manage daily status"
  on daily_meal_status for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.role = 'ADMIN' or (profiles.permissions->>'kitchen')::boolean = true)
    )
  );


-- Update meal_guests to support Options (e.g., 'standard', 'tupper', 'bag')
-- We need to check if column exists first to be safe, or just run 'alter table add column if not exists'
alter table meal_guests add column if not exists option text default 'standard';
alter table meal_guests add column if not exists is_bag boolean default false;

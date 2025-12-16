-- Kitchen Functionality Tables

-- 1. Configuration for Cutoff Times
create table if not exists kitchen_config (
  id uuid default gen_random_uuid() primary key,
  breakfast_cutoff_time time not null default '22:00', -- For next day's breakfast
  lunch_cutoff_time time not null default '10:30',     -- For same day's lunch
  dinner_cutoff_time time not null default '17:00'     -- For same day's dinner
);

-- Ensure only one config row exists (Singleton pattern via unique constraints/policy or just strict usage)
-- We will just insert a default row if not exists in the app logic or seed it here.
insert into kitchen_config (id, breakfast_cutoff_time, lunch_cutoff_time, dinner_cutoff_time)
select gen_random_uuid(), '22:00', '10:30', '17:00'
where not exists (select 1 from kitchen_config);

-- RLS
alter table kitchen_config enable row level security;

-- Everyone can read config (to know if locked)
create policy "Everyone can view kitchen config"
  on kitchen_config for select
  using (auth.role() = 'authenticated');

-- Only Admins can update (assuming granular permissions eventually, but logic handled in app for now or generic admin check)
-- For now, all authenticated can update if we don't have strict roles in RLS yet, but usually we restrict.
-- User has `hasAdminAccess` logic in app. Im implementing permissive RLS for update now, relying on App UI.
-- OR strict:
create policy "Admins can update kitchen config"
  on kitchen_config for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.role = 'ADMIN' or (profiles.permissions->>'kitchen')::boolean = true)
    )
  );


-- 2. Guests / Extra Meals
create table if not exists meal_guests (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  meal_type text not null, -- 'breakfast', 'lunch', 'dinner'
  count integer not null default 0,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table meal_guests enable row level security;

-- Everyone can view (Kitchen needs to see, Users might want to see?)
-- Let's say Kitchen/Admins View. But `DailyMealsList` is public now. So public read.
create policy "Everyone can view guests"
  on meal_guests for select
  using (auth.role() = 'authenticated');

-- Only Admins can insert/update/delete
create policy "Admins can manage guests"
  on meal_guests for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.role = 'ADMIN' or (profiles.permissions->>'kitchen')::boolean = true)
    )
  );

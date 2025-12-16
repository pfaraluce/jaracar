-- Create Maintenance Tickets Table
create table if not exists maintenance_tickets (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  title text not null,
  description text,
  status text default 'open', -- open, in_progress, resolved, closed
  priority text default 'medium', -- low, medium, high, critical
  reporter_id uuid references auth.users not null,
  location text,
  image_url text
);

-- Enable RLS for Maintenance
alter table maintenance_tickets enable row level security;

-- Policy: Users can see all tickets (transparency)
create policy "Users can view all tickets"
  on maintenance_tickets for select
  using (auth.role() = 'authenticated');

-- Policy: Authenticated users can create tickets
create policy "Users can create tickets"
  on maintenance_tickets for insert
  with check (auth.uid() = reporter_id);

-- Policy: Users can update their own tickets (or admin)
-- Simplified: Reporter can edit, Admin can edit (TODO: check admin role properly in backend or assume basic RLS for now)
create policy "Users can update own tickets"
  on maintenance_tickets for update
  using (auth.uid() = reporter_id);


-- Create Meal Templates Table (Weekly preferences)
create table if not exists meal_templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  day_of_week integer not null, -- 1=Monday, 7=Sunday
  meal_type text not null, -- 'breakfast', 'lunch', 'dinner'
  option text not null, -- 'menu_a', 'menu_b', 'diet', 'veggie'
  is_bag boolean default false,
  unique(user_id, day_of_week, meal_type)
);

alter table meal_templates enable row level security;

create policy "Users can view own templates"
  on meal_templates for select
  using (auth.uid() = user_id);

create policy "Users can manage own templates"
  on meal_templates for all
  using (auth.uid() = user_id);


-- Create Meal Orders Table (Daily concrete orders)
create table if not exists meal_orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  date date not null,
  meal_type text not null, -- 'breakfast', 'lunch', 'dinner'
  option text not null,
  is_bag boolean default false,
  status text default 'pending',
  unique(user_id, date, meal_type)
);

alter table meal_orders enable row level security;

create policy "Users can view own orders"
  on meal_orders for select
  using (auth.uid() = user_id);

create policy "Users can manage own orders"
  on meal_orders for all
  using (auth.uid() = user_id);


-- Create Calendars Table
create table if not exists calendars (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  url text not null,
  color text default '#3b82f6'
);

alter table calendars enable row level security;

create policy "Everyone can view calendars"
  on calendars for select
  using (auth.role() = 'authenticated');

create policy "Users can insert calendars"
  on calendars for insert
  with check (auth.role() = 'authenticated');

create policy "Users can delete calendars"
  on calendars for delete
  using (auth.role() = 'authenticated');

-- Clean existing data as requested
truncate table calendar_events, calendars cascade;

-- Add Epacta support
alter table calendars add column if not exists is_epacta boolean default false;

-- Create Calendar Events Cache Table
create table if not exists calendar_events (
  id uuid default gen_random_uuid() primary key,
  calendar_id uuid references calendars(id) on delete cascade not null,
  external_uid text,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz,
  all_day boolean default false,
  location text,
  metadata jsonb, -- For storing Epacta parsed fields
  unique(calendar_id, external_uid)
);

alter table calendar_events enable row level security;


create policy "Users can view events"
  on calendar_events for select
  using (auth.role() = 'authenticated');

create policy "Users can manage events"
  on calendar_events for all
  using (auth.role() = 'authenticated');

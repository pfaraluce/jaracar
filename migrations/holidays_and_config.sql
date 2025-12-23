-- Create holidays table
create table if not exists public.holidays (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  date date not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on holidays
alter table public.holidays enable row level security;

-- Policies for holidays
drop policy if exists "Holidays are viewable by everyone" on public.holidays;
create policy "Holidays are viewable by everyone"
  on public.holidays for select
  using (true);

drop policy if exists "Holidays are manageable by admins and kitchen" on public.holidays;
create policy "Holidays are manageable by admins and kitchen"
  on public.holidays for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and (profiles.role = 'ADMIN' or profiles.role = 'KITCHEN')
    )
  );

-- Update kitchen_config table
alter table public.kitchen_config
add column if not exists schedule_weekdays text,
add column if not exists schedule_saturday text,
add column if not exists schedule_sunday_holiday text,
add column if not exists overrides jsonb default '{}'::jsonb;

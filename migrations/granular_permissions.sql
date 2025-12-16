-- Add permissions column to profiles
alter table profiles add column if not exists permissions jsonb default '{}'::jsonb;

-- Update admin_update_profile function to handle permissions
-- This replaces the existing function to support the new parameter
create or replace function admin_update_profile(
    target_user_id uuid,
    new_status text default null,
    new_role text default null,
    new_permissions jsonb default null
)
returns void
language plpgsql
security definer
as $$
begin
  -- Validate executing user is admin (optional extra security)
  if not exists (
    select 1 from profiles 
    where id = auth.uid() and role = 'ADMIN'
  ) then
    raise exception 'Unauthorized';
  end if;

  update profiles
  set 
    status = coalesce(new_status, status),
    role = coalesce(new_role, role),
    permissions = coalesce(new_permissions, permissions),
    updated_at = now()
  where id = target_user_id;
end;
$$;

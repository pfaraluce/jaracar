-- Update handle_new_user function to assign default permissions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status, permissions)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'USER',
    'PENDING',
    '{
      "meals": { "view": true, "admin": false },
      "calendar": { "view": true, "admin": false },
      "vehicles": { "view": true, "admin": false },
      "maintenance": { "view": true, "admin": false }
    }'::jsonb
  );
  RETURN new;
END;
$$;

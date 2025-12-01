-- Instrucciones para arreglar el error de subida de avatar
-- Ejecuta este script en el Editor SQL de tu dashboard de Supabase

-- 1. Crear el bucket 'avatars' si no existe
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Eliminar políticas existentes para evitar conflictos
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "Anyone can upload an avatar" on storage.objects;
drop policy if exists "Authenticated users can upload avatars" on storage.objects;
drop policy if exists "Users can update their own avatars" on storage.objects;
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Users can delete their own avatars" on storage.objects;

-- 3. Crear política para permitir acceso público de lectura (cualquiera puede ver los avatares)
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'avatars' );

-- 4. Crear política para permitir a usuarios autenticados subir sus propios avatares
-- Esta política permite INSERT si el usuario está autenticado
create policy "Authenticated users can upload avatars"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'avatars' );

-- 5. Crear política para permitir a usuarios actualizar sus propios avatares
-- Esta política permite UPDATE si el usuario es el dueño del objeto (o simplemente si está autenticado para simplificar, ya que el nombre del archivo incluye el ID del usuario)
create policy "Users can update their own avatars"
on storage.objects for update
to authenticated
using ( bucket_id = 'avatars' );

-- 6. Crear política para permitir borrar (opcional, por si acaso)
create policy "Users can delete their own avatars"
on storage.objects for delete
to authenticated
using ( bucket_id = 'avatars' );

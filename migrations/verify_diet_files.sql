-- Script de verificación completa del estado de diet_files
-- Ejecuta esto en Supabase SQL Editor para ver el estado actual

-- 1. Verificar estructura de la tabla
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'diet_files'
ORDER BY ordinal_position;

-- 2. Verificar RLS está habilitado
SELECT 
    schemaname,
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'diet_files';

-- 3. Ver todas las políticas actuales
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'diet_files'
ORDER BY cmd;

-- 4. Verificar foreign keys
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'diet_files';

-- 5. Intentar un INSERT de prueba (esto fallará si RLS está mal configurado)
-- NOTA: Reemplaza 'tu-user-id-aqui' con tu ID de usuario real
-- Puedes obtenerlo ejecutando: SELECT auth.uid();

-- Primero, ver tu user ID actual:
SELECT auth.uid() as my_user_id;

-- Luego intenta insertar (descomenta y reemplaza el UUID):
-- INSERT INTO diet_files (user_id, file_name, file_path, file_size, mime_type)
-- VALUES (
--     auth.uid(),  -- Esto debería usar tu ID autenticado
--     'test.pdf',
--     'test-path/test.pdf',
--     1024,
--     'application/pdf'
-- );

-- Script de diagnóstico y corrección para diet_files RLS
-- Ejecuta esto paso a paso en Supabase SQL Editor

-- PASO 1: Verificar que la tabla existe y tiene RLS habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'diet_files';

-- PASO 2: Ver las políticas actuales
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'diet_files';

-- PASO 3: Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "Users can view own diet files" ON diet_files;
DROP POLICY IF EXISTS "Users can insert own diet files" ON diet_files;
DROP POLICY IF EXISTS "Users can update own diet files" ON diet_files;
DROP POLICY IF EXISTS "Users can delete own diet files" ON diet_files;

-- PASO 4: Deshabilitar RLS temporalmente para probar
ALTER TABLE diet_files DISABLE ROW LEVEL SECURITY;

-- PASO 5: Volver a habilitar RLS
ALTER TABLE diet_files ENABLE ROW LEVEL SECURITY;

-- PASO 6: Crear políticas más permisivas para debugging
-- Política SELECT - permite ver propios archivos
CREATE POLICY "diet_files_select_policy"
  ON diet_files
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Política INSERT - permite insertar propios archivos
CREATE POLICY "diet_files_insert_policy"
  ON diet_files
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Política UPDATE - permite actualizar propios archivos
CREATE POLICY "diet_files_update_policy"
  ON diet_files
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Política DELETE - permite eliminar propios archivos
CREATE POLICY "diet_files_delete_policy"
  ON diet_files
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- PASO 7: Verificar que las políticas se crearon correctamente
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'diet_files';

-- PASO 8: Verificar el tipo de columna user_id
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'diet_files' AND column_name = 'user_id';

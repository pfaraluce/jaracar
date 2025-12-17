-- Corrección definitiva para diet_files
-- Este script recrea la tabla correctamente

-- 1. Eliminar la tabla existente (si existe) y recrearla correctamente
DROP TABLE IF EXISTS diet_files CASCADE;

-- 2. Crear la tabla con la referencia correcta
CREATE TABLE diet_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE diet_files ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas RLS
CREATE POLICY "diet_files_select_policy"
  ON diet_files
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "diet_files_insert_policy"
  ON diet_files
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "diet_files_update_policy"
  ON diet_files
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "diet_files_delete_policy"
  ON diet_files
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 5. Crear índice para mejor performance
CREATE INDEX IF NOT EXISTS idx_diet_files_user_id ON diet_files(user_id);

-- 6. Verificar que todo está correcto
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'diet_files';

SELECT 
  policyname, 
  cmd as operation,
  roles
FROM pg_policies
WHERE tablename = 'diet_files';

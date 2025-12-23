-- 1. Actualizar la función de asignación automática
CREATE OR REPLACE FUNCTION assign_diet_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Solo asignar si has_diet pasa de FALSE a TRUE y no tiene número
  IF NEW.has_diet = TRUE AND (OLD.has_diet IS NULL OR OLD.has_diet = FALSE) THEN
    -- Buscar el primer hueco libre empezando desde 1
    SELECT n FROM generate_series(1, 1000) n
    WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE has_diet = TRUE AND diet_number = n)
    LIMIT 1 INTO next_number;
    
    NEW.diet_number := next_number;
  ELSIF NEW.has_diet = FALSE THEN
    -- Al desactivar, liberamos el número pero MANTENEMOS diet_name y diet_notes
    NEW.diet_number := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear función para compactar números (rellenar huecos)
CREATE OR REPLACE FUNCTION compact_diet_numbers()
RETURNS VOID AS $$
BEGIN
  -- Esta consulta reasigna 1, 2, 3... basándose en el orden actual
  WITH ordered_diets AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY diet_number ASC, full_name ASC) as new_num
    FROM profiles
    WHERE has_diet = TRUE
  )
  UPDATE profiles
  SET diet_number = ordered_diets.new_num
  FROM ordered_diets
  WHERE profiles.id = ordered_diets.id;
END;
$$ LANGUAGE plpgsql;

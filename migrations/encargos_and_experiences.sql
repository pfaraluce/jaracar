-- Migración: Sistema de Encargos y Experiencias

-- 1. Tabla de Encargos (tasks)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    title TEXT NOT NULL,
    description TEXT,
    assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.cars(id) ON DELETE SET NULL,
    type TEXT DEFAULT 'general', -- 'general', 'vehicle'
    status TEXT DEFAULT 'open' -- 'open', 'completed'
);

-- Habilitar RLS para tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Políticas para tasks
CREATE POLICY "Usuarios pueden ver sus propios encargos"
    ON public.tasks FOR SELECT
    USING (auth.uid() = assigned_user_id);

CREATE POLICY "Admins pueden gestionar todos los encargos"
    ON public.tasks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );

-- 2. Modificar tabla de Vehículos (cars) para añadir encargado directo
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Modificar tabla de Documentos (house_documents) para categorías
ALTER TABLE public.house_documents ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- 4. Función para sincronizar encargado de vehículo con tareas
CREATE OR REPLACE FUNCTION sync_vehicle_task()
RETURNS TRIGGER AS $$
BEGIN
    -- Si se asigna un usuario a un vehículo
    IF NEW.assigned_user_id IS NOT NULL AND (OLD.assigned_user_id IS NULL OR OLD.assigned_user_id <> NEW.assigned_user_id) THEN
        -- Crear o actualizar tarea de vehículo
        INSERT INTO public.tasks (title, description, assigned_user_id, vehicle_id, type, status)
        VALUES (
            'Encargado de Vehículo: ' || NEW.name,
            'Eres el encargado responsable de la matrícula ' || NEW.license_plate,
            NEW.assigned_user_id,
            NEW.id,
            'vehicle',
            'open'
        )
        ON CONFLICT (id) DO UPDATE SET -- Esto es solo si quisiéramos rastrear por ID único, pero mejor insertar nueva si cambia
        assigned_user_id = EXCLUDED.assigned_user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Nota: La sincronización bidireccional compleja mejor manejarla desde el service layer 
-- para evitar recursión infinita o lógica de trigger pesada.

-- Comentarios
COMMENT ON TABLE public.tasks IS 'Tabla para gestionar encargos asignados a residentes.';
COMMENT ON COLUMN public.cars.assigned_user_id IS 'Usuario principal responsable del vehículo.';
COMMENT ON COLUMN public.house_documents.category IS 'Categoría del documento (ej. general, experience).';

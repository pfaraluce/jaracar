INSERT INTO public.holidays (date, name) VALUES
('2025-01-01', 'Año Nuevo'),
('2025-01-06', 'Epifanía del Señor'),
('2025-04-17', 'Jueves Santo'),
('2025-04-18', 'Viernes Santo'),
('2025-05-01', 'Fiesta del Trabajo'),
('2025-05-02', 'Fiesta de la Comunidad de Madrid'),
('2025-05-15', 'San Isidro Labrador'),
('2025-07-25', 'Santiago Apóstol'),
('2025-08-15', 'Asunción de la Virgen'),
('2025-11-01', 'Todos los Santos'),
('2025-11-10', 'Nuestra Señora de La Almudena (trasladado)'),
('2025-12-06', 'Día de la Constitución Española'),
('2025-12-08', 'Día de la Inmaculada Concepción'),
('2025-12-25', 'Natividad del Señor')
ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name;

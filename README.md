<div align="center">
<img width="1200" height="475" alt="Quango Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Quango - Gestión Integral de Residencias

**Quango** (quango.app) es una plataforma completa para la gestión de residencias que centraliza todas las necesidades operativas en una sola aplicación.

## Características Principales

### 🚗 Gestión de Vehículos
- Reserva y gestión de flota de vehículos
- Seguimiento de mantenimiento y revisiones
- Historial de uso y actividad
- Reservas para invitados externos

### 🍽️ Gestión de Comidas
- Sistema de pedidos de comidas (desayuno, comida, cena)
- Plantillas semanales personalizables
- Gestión de dietas especiales con asignación automática de números
- Control de horarios de cocina y fechas límite
- Panel administrativo para cocina

### 🔧 Mantenimiento
- Sistema de tickets de mantenimiento
- Seguimiento de estado y prioridades
- Asignación de responsables
- Historial completo de incidencias

### 📅 Calendario
- Integración con calendarios externos (iCal)
- Soporte para calendarios Epacta
- Visualización de eventos y actividades
- Sincronización automática

### 👤 Perfiles de Usuario
- Información personal completa (nombre, email, cumpleaños, siglas)
- Gestión de dietas especiales con:
  - Asignación automática de número de dieta
  - Nombre y descripción de la dieta
  - Carga de archivos relacionados (certificados médicos, etc.)
  - Reutilización inteligente de números liberados
- Personalización de apariencia (tema claro/oscuro)
- Sistema de permisos granulares
- Avatares personalizados

## Tecnologías

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Animaciones**: Framer Motion
- **Iconos**: Lucide React

## Instalación y Desarrollo

### Prerequisitos
- Node.js (v16 o superior)
- Cuenta de Supabase

### Configuración

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Configurar variables de entorno:
   - Crear archivo `.env.local`
   - Añadir credenciales de Supabase:
     ```
     VITE_SUPABASE_URL=tu_url_de_supabase
     VITE_SUPABASE_ANON_KEY=tu_clave_anonima
     ```

3. Ejecutar migraciones de base de datos:
   - Aplicar los archivos SQL de la carpeta `migrations/` en tu proyecto de Supabase
   - Crear los buckets de almacenamiento necesarios:
     - `avatars` (público)
     - `diet-files` (privado)

4. Ejecutar en desarrollo:
   ```bash
   npm run dev
   ```

## Estructura de la Base de Datos

### Tablas Principales
- `profiles` - Información de usuarios con campos de dieta
- `vehicles` - Gestión de vehículos
- `reservations` - Reservas de vehículos
- `meal_templates` - Plantillas de comidas semanales
- `meal_orders` - Pedidos de comidas diarios
- `maintenance_tickets` - Tickets de mantenimiento
- `calendars` - Calendarios externos
- `calendar_events` - Eventos de calendario
- `diet_files` - Archivos relacionados con dietas

### Almacenamiento
- `avatars/` - Fotos de perfil de usuarios
- `diet-files/` - Documentos relacionados con dietas (certificados, recetas médicas, etc.)

## Gestión de Dietas

El sistema de dietas incluye:
- **Activación/Desactivación**: Toggle simple en el perfil
- **Número Automático**: Se asigna el número más bajo disponible (1, 2, 3...)
- **Reutilización**: Cuando un usuario desactiva su dieta, el número queda disponible
- **Información**: Nombre de dieta y notas adicionales
- **Documentación**: Subida de archivos PDF, imágenes y documentos

## Licencia

Proyecto privado - Todos los derechos reservados


-- Semilla para la Guía de la App (Manual de Usuario)

-- Limpiar guía existente para evitar duplicados si se corre varias veces (opcional, cuidado en prod)
-- DELETE FROM app_guide; 

INSERT INTO app_guide (title, content, order_index) VALUES
(
    '1. Inicio y Encargos',
    'La pantalla de **Inicio** es tu panel de control principal. Aquí encontrarás:

- **Tu Próximo Turno de Comida:** Si tienes un turno asignado pronto, aparecerá destacado.
- **Estado de la Cocina:** Un indicador en tiempo real de si la cocina está abierta o cerrada.
- **Tus Encargos:** Las tareas que tienes asignadas actualmente.

**Encargos:**
En la sección de encargos puedes ver el detalle de tus responsabilidades. Cuando completes una tarea, recuerda marcarla como realizada. Si tienes un vehículo asignado, también podrás ver sus detalles aquí.',
    1
),
(
    '2. Gestión de Comidas',
    'El sistema de comidas te permite:

- **Ver el Menú:** Consulta qué hay para comer cada día.
- **Pedir Platos:** Puedes solicitar tu comida o cena antes de la hora de corte.
- **Cancelar Pedidos:** Si cambias de planes, cancela tu pedido para evitar desperdicio.
- **Late Plates:** Si no puedes llegar a hora, solicita que te guarden un plato.

**Importante:** Los pedidos se cierran automáticamente a la hora límite establecida por cocina.',
    2
),
(
    '3. Reservas de Vehículos',
    'Para utilizar los coches de la casa:

1. Ve a la sección de **Vehículos**.
2. Selecciona el coche que necesitas.
3. Elige la fecha y hora de inicio y fin.
4. Indica el motivo del viaje.

**Normas de uso:**
- Respeta los horarios de reserva.
- Deja el coche con gasolina (marca el nivel al finalizar).
- Reporta cualquier incidencia o avería inmediatamente en la app.',
    3
),
(
    '4. Mensajería y Avisos',
    'La sección de **Mensajería** es el canal oficial de comunicación:

- **Anuncios:** Tablón de noticias de la administración.
- **Chat General:** Para conversar con todos los residentes.
- **Chats Privados:** Puedes iniciar conversaciones con otros usuarios.

Recibirás notificaciones push para mensajes importantes si las tienes activadas en tu perfil.',
    4
),
(
    '5. Perfil y Ajustes',
    'En **Mi Perfil** puedes:

- **Editar tus datos:** Cambiar tu avatar, apodo o teléfono.
- **Dieta:** Indicar si tienes alergias o necesidades especiales.
- **Notificaciones:** Personalizar qué alertas quieres recibir.
- **Estado:** Ponerte en modo "No molestar" o actualizar tu estado.

**Tema:** Puedes cambiar entre modo claro y oscuro desde el menú de usuario.',
    5
);

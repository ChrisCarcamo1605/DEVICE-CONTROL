## DEVICE CONTROL  
El sistema consiste en la gestion de dispositivos de una empresa que tiene diferentes sucursales en todo el pais. Abre una ventana de preguntas para terminar de validar caracteristicas del sistema y escribe el plan de implementacion en este mismo documento.


### STACK TECNOLOGICO
- Backend: Express + Knex
- Frontend: Bootstrap
- Database: Supabase Postgres


### Objetivo
Poder gestionar los dispositivos de todas las sucursales, y poder gestionar la compra y reparacion de equipos mediante un sistema de tickets. 

### Actores
#### Gerente de Sucursal
En cada sucursal existira un gerente el cual sera el usuario que abrira ticket para poder reportar algun equipo averiado.

#### IT Manager
Sera el encargado de tomar el ticket y darlse seguimiento. Este se encargara de agendar una cita para la recoleccion del equipo como tambien la devolucion del mismo o uno nuevo.


### Flujo

1. Gerente abre ticket sobre articulo averiado.
2. Sistema lo procesa y pone el ticket en su correspondiente estado(pendiente, en diagnostico, esperando repuestos, en reparacion, finalizado, cancelado, entregado al usuario).
3. Un IT Manager toma el ticket y agenda una cita para la recoleccion del equipo.\
4. Se trae el equipo a la sucursal central.
5. IT Manager cambia el estado del equipo y agrega tags de los defectos del equipo (mojado, roto, falla electrica, etc).
6. IT Manager evalua si requiere reparacion, necesidad de comprar repuestos o comprar un equipo nuevo.
7. IT Manager agrega en el historial del equipo que sera reemplado o reparado.
8. IT Manager Manager registra compra de repuestos o nuevo equipo.
9. IT Manager agenta una fecha para la devolucion del equipo.


### Requerimientos.

- Un dispositivo puede ser compuesto por mas dispositivos. Por el ejemplo los componentes de una pc, cada componente tiene un ID. Y cuando se ven los detalles del dispositivo, tiene que haber una lista con los demas dispositivos que lo componen o al dispositivo que pertenece.

- Un IT Manager tiene que registrar la compra de repuestos o dispositivos cada que lo necesito y asignarselo a la sucursal a la cual va destinado el equipo.

- Un ticket tiene que registrar la fecha de reporte, fecha de recoleccion, fecha de devolucion, problema presentado(descripcion del problema), ID_IT_MANAGER, ID.

- Cada dispositivo puede mantener un historial de mantenimientos donde se registren las observaciones  y diagnostico.

- Un dispositivo debe tener registrado sucursal a la que pertenece, IT Manager que lo asigno, valor, fecha de compra, numero de factura, categoria.

- El IT_Manager es el rol admin del sistema.


### UI
Para la UI necesitamos utilizar bootstrap con la siguiente paleta de colores:

  - --bg: #e8e3d8 — sidebar
  - Contenido/main: blanco puro
  - Botón primario: navy oscuro #1a2055
  - Botón secundario: azul medio #7b8fc4
  - Links de acción (Editar • Eliminar): azul #2d4fd6
  - Tabla: fondo blanco, separadores suaves

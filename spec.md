# DEVICE CONTROL — Spec Técnico

## Stack
- **Backend**: Node.js + Express + Knex
- **Frontend**: Bootstrap 5 + Vanilla JS (server-side rendering con EJS)
- **Database**: Supabase Postgres (conexión directa vía Knex)
- **Auth**: Supabase Auth (JWT) — sesión manejada en el cliente con el token JWT

---

## Roles

| Rol | Descripción |
|-----|-------------|
| `it_manager` | Admin del sistema. Gestiona dispositivos, toma tickets, agenda citas, registra compras. |
| `branch_manager` | Gerente de sucursal. Solo puede abrir tickets sobre equipos de su sucursal. |

El rol se almacena en `profiles.role` y en el JWT claim `app_metadata.role` (asignado via Supabase Auth Admin API al crear el usuario).

---

## Base de Datos — Esquema

### `locations` (Ubicaciones)
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
name        text NOT NULL          -- nombre del municipio/ciudad
department  text NOT NULL          -- departamento o estado
country     text NOT NULL DEFAULT 'Honduras'
created_at  timestamptz DEFAULT now()
```

### `branches` (Sucursales)
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
name        text NOT NULL
address     text
location_id uuid REFERENCES locations(id)
phone       text
created_at  timestamptz DEFAULT now()
```

### `profiles` (extiende auth.users)
```sql
id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
full_name   text NOT NULL
role        text NOT NULL CHECK (role IN ('it_manager', 'branch_manager'))
branch_id   uuid REFERENCES branches(id)  -- NULL para it_manager
created_at  timestamptz DEFAULT now()
```

### `device_categories`
```sql
id    uuid PRIMARY KEY DEFAULT gen_random_uuid()
name  text NOT NULL UNIQUE
```

### `devices` (Dispositivos)
```sql
id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
name              text NOT NULL
serial_number     text UNIQUE
category_id       uuid REFERENCES device_categories(id)
branch_id         uuid NOT NULL REFERENCES branches(id)
parent_device_id  uuid REFERENCES devices(id)   -- componente de otro dispositivo
assigned_by       uuid REFERENCES profiles(id)   -- IT Manager que lo asignó
value             numeric(10,2)
purchase_date     date
invoice_number    text
status            text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','in_repair','replaced','retired'))
created_at        timestamptz DEFAULT now()
updated_at        timestamptz DEFAULT now()
```

> Un dispositivo con `parent_device_id` es un componente del dispositivo padre.
> Al ver el detalle de un dispositivo se muestran sus componentes (hijos) y el dispositivo al que pertenece (padre).

### `defect_tags`
```sql
id    uuid PRIMARY KEY DEFAULT gen_random_uuid()
name  text NOT NULL UNIQUE   -- mojado, roto, falla_electrica, etc.
```

### `tickets`
```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
device_id           uuid NOT NULL REFERENCES devices(id)
branch_id           uuid NOT NULL REFERENCES branches(id)
reported_by         uuid NOT NULL REFERENCES profiles(id)   -- branch_manager
it_manager_id       uuid REFERENCES profiles(id)            -- asignado al tomar el ticket
status              text NOT NULL DEFAULT 'pending'
                    CHECK (status IN (
                      'pending',           -- recién abierto
                      'in_diagnosis',      -- IT Manager tomó el ticket
                      'waiting_parts',     -- esperando repuestos
                      'in_repair',         -- en reparación
                      'finalized',         -- reparación terminada
                      'cancelled',         -- cancelado
                      'delivered'          -- entregado al usuario
                    ))
problem_description text NOT NULL
report_date         timestamptz NOT NULL DEFAULT now()
collection_date     timestamptz              -- fecha agendada para recolección
collection_done_at  timestamptz              -- fecha real de recolección
return_date         timestamptz              -- fecha agendada para devolución
return_done_at      timestamptz              -- fecha real de devolución
resolution_notes    text
created_at          timestamptz DEFAULT now()
updated_at          timestamptz DEFAULT now()
```

### `ticket_tags` (M:N tickets ↔ defect_tags)
```sql
ticket_id  uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE
tag_id     uuid NOT NULL REFERENCES defect_tags(id) ON DELETE CASCADE
PRIMARY KEY (ticket_id, tag_id)
```

### `maintenance_history`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
device_id       uuid NOT NULL REFERENCES devices(id)
ticket_id       uuid REFERENCES tickets(id)
it_manager_id   uuid NOT NULL REFERENCES profiles(id)
action          text NOT NULL CHECK (action IN ('diagnosis','repair','replace','new_purchase'))
observations    text
diagnosis       text
created_at      timestamptz DEFAULT now()
```

### `purchases` (Compras de repuestos / equipos nuevos)
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
ticket_id       uuid REFERENCES tickets(id)
it_manager_id   uuid NOT NULL REFERENCES profiles(id)
branch_id       uuid NOT NULL REFERENCES branches(id)   -- sucursal destino
type            text NOT NULL CHECK (type IN ('spare_part','new_device'))
description     text NOT NULL
amount          numeric(10,2) NOT NULL
invoice_number  text
purchase_date   date NOT NULL
new_device_id   uuid REFERENCES devices(id)   -- si type=new_device, dispositivo registrado
created_at      timestamptz DEFAULT now()
```

---

## Diagrama de Relaciones (simplificado)

```
branches ──< devices >── device_categories
    │              │
    │         parent_device_id (self-ref)
    │              │
profiles ──< tickets >── ticket_tags >── defect_tags
    │              │
    └──< maintenance_history
    └──< purchases
```

---

## API Routes

### Auth (Supabase Auth — client-side)
El frontend usa `@supabase/supabase-js` para login/logout.  
El backend valida el JWT en cada request via middleware.

```
POST   /auth/login         -- redirige a Supabase Auth
POST   /auth/logout
GET    /auth/me            -- devuelve perfil del usuario autenticado
```

### Branches
```
GET    /api/branches                -- todos (ambos roles)
POST   /api/branches                -- [it_manager]
GET    /api/branches/:id
PUT    /api/branches/:id            -- [it_manager]
```

### Device Categories
```
GET    /api/categories              -- todos
POST   /api/categories              -- [it_manager]
DELETE /api/categories/:id          -- [it_manager]
```

### Defect Tags
```
GET    /api/tags                    -- todos
POST   /api/tags                    -- [it_manager]
DELETE /api/tags/:id                -- [it_manager]
```

### Devices
```
GET    /api/devices                 -- con filtros: ?branch_id=&category_id=&status=
POST   /api/devices                 -- [it_manager]
GET    /api/devices/:id             -- incluye componentes hijos + padre
PUT    /api/devices/:id             -- [it_manager]
DELETE /api/devices/:id             -- [it_manager]
GET    /api/devices/:id/history     -- historial de mantenimiento
POST   /api/devices/:id/history     -- [it_manager] agregar entrada al historial
```

### Tickets
```
GET    /api/tickets                 -- filtros: ?status=&branch_id=&it_manager_id=
POST   /api/tickets                 -- [branch_manager] abrir ticket
GET    /api/tickets/:id             -- detalle completo (device, tags, historial)
PATCH  /api/tickets/:id/status      -- [it_manager] cambiar estado
PATCH  /api/tickets/:id/assign      -- [it_manager] tomarse el ticket
PATCH  /api/tickets/:id/schedule-collection  -- [it_manager] agendar recolección
PATCH  /api/tickets/:id/schedule-return      -- [it_manager] agendar devolución
POST   /api/tickets/:id/tags        -- [it_manager] agregar defect tags
DELETE /api/tickets/:id/tags/:tag_id -- [it_manager]
```

### Purchases
```
GET    /api/purchases               -- filtros: ?branch_id=&type=&ticket_id=
POST   /api/purchases               -- [it_manager]
GET    /api/purchases/:id
```

### Users (admin)
```
GET    /api/users                   -- [it_manager]
POST   /api/users                   -- [it_manager] crea usuario via Supabase Admin
GET    /api/users/:id
PUT    /api/users/:id               -- [it_manager]
```

---

## Flujo de Estados del Ticket

```
[branch_manager abre]
        │
     pending
        │
   [it_manager toma]
        │
  in_diagnosis
        │
   ┌────┴────────────────┐
   │                     │
waiting_parts         in_repair
   │                     │
   └─────────┬───────────┘
             │
          finalized
             │
        [it_manager agenda devolución]
             │
          delivered
             │
          (o en cualquier momento)
             │
          cancelled
```

---

## Estructura del Proyecto

```
DEVICE-CONTROL/
├── .env
├── package.json
├── knexfile.js
├── src/
│   ├── app.js                  -- Express app setup
│   ├── server.js               -- Entry point
│   ├── config/
│   │   ├── db.js               -- Knex instance
│   │   └── supabase.js         -- Supabase client (admin)
│   ├── middleware/
│   │   ├── auth.js             -- Valida JWT, inyecta req.user
│   │   └── requireRole.js      -- requireRole('it_manager')
│   ├── routes/
│   │   ├── auth.js
│   │   ├── branches.js
│   │   ├── devices.js
│   │   ├── tickets.js
│   │   ├── purchases.js
│   │   ├── categories.js
│   │   ├── tags.js
│   │   └── users.js
│   ├── controllers/            -- Lógica por recurso (mismo nombre que routes)
│   ├── views/                  -- EJS templates
│   │   ├── layouts/
│   │   │   └── main.ejs        -- Layout con sidebar + nav
│   │   ├── partials/
│   │   │   ├── sidebar.ejs
│   │   │   └── navbar.ejs
│   │   ├── auth/
│   │   │   └── login.ejs
│   │   ├── devices/
│   │   │   ├── index.ejs
│   │   │   ├── show.ejs
│   │   │   └── form.ejs
│   │   ├── tickets/
│   │   │   ├── index.ejs
│   │   │   ├── show.ejs
│   │   │   └── form.ejs
│   │   ├── purchases/
│   │   │   ├── index.ejs
│   │   │   └── form.ejs
│   │   └── branches/
│   │       ├── index.ejs
│   │       └── form.ejs
│   └── public/
│       ├── css/
│       │   └── theme.css       -- Variables de color + overrides Bootstrap
│       └── js/
│           └── main.js
├── migrations/
│   ├── 001_create_locations.js
│   ├── 002_create_branches.js
│   ├── 003_create_profiles.js
│   ├── 004_create_device_categories.js
│   ├── 005_create_defect_tags.js
│   ├── 006_create_devices.js
│   ├── 007_create_tickets.js
│   ├── 008_create_ticket_tags.js
│   ├── 009_create_maintenance_history.js
│   └── 010_create_purchases.js
└── seeds/
    ├── 01_locations.js
    ├── 02_branches.js
    ├── 03_categories.js
    └── 04_tags.js
```

---

## UI — Paleta y Componentes

```css
--bg-sidebar:     #e8e3d8;
--bg-main:        #ffffff;
--btn-primary:    #1a2055;
--btn-secondary:  #7b8fc4;
--link-action:    #2d4fd6;
--table-bg:       #ffffff;
--table-border:   #e0ddd6;
```

### Layout Principal
```
┌─────────────────────────────────────────────────────┐
│  NAVBAR: logo + usuario + logout          [#ffffff]  │
├──────────────┬──────────────────────────────────────┤
│  SIDEBAR     │  MAIN CONTENT                        │
│  [#e8e3d8]   │  [#ffffff]                           │
│              │                                      │
│  Dashboard   │  <page content>                      │
│  Dispositivos│                                      │
│  Tickets     │                                      │
│  Compras     │                                      │
│  Sucursales  │                                      │
│  Usuarios    │  (solo it_manager)                   │
│  Categorías  │  (solo it_manager)                   │
│  Tags        │  (solo it_manager)                   │
└──────────────┴──────────────────────────────────────┘
```

### Tabla Estándar
```
┌─────────────────────────────────────────────────────┐
│  Título de sección          [+ Nuevo btn #1a2055]   │
├─────────┬──────────┬──────────┬─────────────────────┤
│  Col 1  │  Col 2   │  Col 3   │  Acciones           │
├─────────┼──────────┼──────────┼─────────────────────┤
│  data   │  data    │  data    │  Editar • Eliminar  │
│         │          │          │  [#2d4fd6]          │
└─────────┴──────────┴──────────┴─────────────────────┘
```

### Ticket Status Badge
```
pending          → badge gris
in_diagnosis     → badge azul
waiting_parts    → badge amarillo
in_repair        → badge naranja
finalized        → badge verde
cancelled        → badge rojo
delivered        → badge verde oscuro
```

---

## Fases de Implementación

### Fase 1 — Setup base
- [ ] Inicializar proyecto Node.js + instalar dependencias
- [ ] Configurar Knex + conexión a Supabase
- [ ] Ejecutar migraciones
- [ ] Setup Express + EJS + layout base
- [ ] Middleware de auth (validar JWT de Supabase)

### Fase 2 — CRUD core
- [ ] Branches CRUD
- [ ] Categories + Tags CRUD
- [ ] Devices CRUD (con composición padre/hijo)
- [ ] Users CRUD (via Supabase Admin API)

### Fase 3 — Tickets
- [ ] Crear ticket (branch_manager)
- [ ] Listar + filtrar tickets
- [ ] Detalle de ticket
- [ ] Flujo de estados
- [ ] Asignación de tags de defecto
- [ ] Agendar recolección y devolución

### Fase 4 — Historial y Compras
- [ ] Historial de mantenimiento por dispositivo
- [ ] Registro de compras ligadas a ticket

### Fase 5 — Dashboard
- [ ] Métricas: tickets por estado, dispositivos por sucursal
- [ ] Vista diferenciada por rol

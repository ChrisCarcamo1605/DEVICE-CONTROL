# Device Control

Sistema de gestión de dispositivos e incidencias para sucursales. Permite registrar equipos, abrir tickets de reparación y llevar historial de mantenimiento.

---

## Requisitos

- Node.js 22+
- npm
- Una cuenta de [Supabase](https://supabase.com) **o** Docker + Docker Compose para correr Postgres localmente

---

## Opción A — Desarrollo con Supabase (hosted)

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd device-control
npm install
```

### 2. Configurar variables de entorno

Copia el ejemplo y completa los valores:

```bash
cp .env.example .env
```

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (ej. `3000`) |
| `NODE_ENV` | `development` o `production` |
| `SUPABASE_URL` | URL de tu proyecto Supabase |
| `SUPABASE_ANON_KEY` | Anon/public key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase |
| `DATABASE_URL` | Postgres connection string (desde Supabase → Settings → Database) |
| `SESSION_SECRET` | String secreto para firmar cookies |

### 3. Correr migraciones

```bash
npm run migrate
```

### 4. Cargar datos de referencia (opcional)

```bash
npm run seed           # locations, branches, categorías, tags
node scripts/seed_demo.js  # datos de demo (dispositivos, tickets, etc.)
```

### 5. Iniciar servidor

```bash
npm run dev    # desarrollo con auto-reload
npm start      # producción
```

El servidor queda disponible en `http://localhost:3000`.

---

## Opción B — Desarrollo con Docker (Postgres local)

No necesitas cuenta de Supabase para la base de datos. La autenticación JWT sigue usando Supabase hosted.

### 1. Instalar dependencias Node (para correr migraciones localmente si es necesario)

```bash
npm install
```

### 2. Levantar contenedores

```bash
docker compose --env-file .env.docker up --build
```

Esto:
1. Levanta un contenedor `db` (Postgres 16) e inicializa el schema con `init.sql`
2. Construye la imagen de la app
3. Corre `npm run migrate` antes de arrancar el servidor

La app queda disponible en `http://localhost:3000`.

### 3. Cargar datos de referencia (en otro terminal)

```bash
# Con los contenedores corriendo:
docker compose --env-file .env.docker exec app npm run seed
docker compose --env-file .env.docker exec app node scripts/seed_demo.js
```

### Variables en `.env.docker`

El único cambio respecto a `.env` es `DATABASE_URL`, que apunta al contenedor `db` en lugar de Supabase:

```
DATABASE_URL=postgresql://postgres:postgres@db:5432/postgres
```

Las claves de Supabase se mantienen porque la autenticación (login/JWT) sigue siendo hosted.

---

## Comandos útiles

```bash
npm run migrate           # aplicar migraciones pendientes
npm run migrate:rollback  # revertir último batch de migraciones
npm run seed              # datos de referencia (locations, branches, categorías, tags)
node scripts/seed_demo.js # datos de demo
```

---

## Roles

| Rol | Acceso |
|---|---|
| `it_manager` | Todas las sucursales — CRUD completo |
| `branch_manager` | Solo su sucursal — ver/crear dispositivos, abrir tickets |

Los usuarios se crean desde Supabase Auth (Dashboard → Authentication → Users). Al registrar un usuario hay que insertar su perfil en la tabla `profiles` con el mismo UUID, asignando `role` y `branch_id`.

---

## Stack

- **Express 5** + EJS (server-side rendering)
- **Knex** — query builder contra Postgres
- **Supabase Auth** — autenticación JWT via cookie httpOnly
- **Postgres 16** (Supabase hosted o Docker local)

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # development server with auto-reload (node --watch)
npm start            # production server
npm run migrate      # run pending Knex migrations
npm run migrate:rollback  # rollback last migration batch
npm run seed         # run all Knex seeds
node scripts/seed_demo.js  # generate demo data
```

No test runner or linter is configured.

## Architecture

Express 5 server-side app with EJS templates. All data goes through Knex (SQL query builder) against Supabase Postgres — **do not use the Supabase JS client for data queries**, only for Auth.

```
src/
  server.js          # entry point — loads .env, starts HTTP server
  app.js             # Express setup: middleware, route mounts, res.locals
  config/
    db.js            # Knex instance (DATABASE_URL)
    supabase.js      # Supabase client (Auth only)
  middleware/
    auth.js          # requireAuth (JWT cookie) + requireRole(role)
  routes/            # one file per feature (auth, dashboard, devices, tickets, purchases, ...)
  views/             # EJS templates organized by feature + layouts/
migrations/          # Knex migration files (source of truth for schema)
seeds/               # reference/demo data
```

## Auth Flow

1. `POST /auth/login` → Supabase Auth email/password → JWT stored in httpOnly cookie `access_token`
2. `requireAuth` middleware verifies JWT on every protected route; attaches `req.user` (profile row including `role` and `branch_id`)
3. `requireRole('it_manager')` guards admin-only routes

## Roles & Data Scoping

| Role | Scope |
|------|-------|
| `it_manager` | All branches — full CRUD on everything |
| `branch_manager` | Own branch only — view/create devices, open tickets |

Every route that returns lists must filter by `req.user.branch_id` when `req.user.role === 'branch_manager'`.

## Key Data Model Relationships

- **devices** → `parent_device_id` (self-referencing for components), `category_id`, `branch_id`
- **tickets** → `device_id`, `branch_id`, `reported_by` (branch_manager), `it_manager_id`; status workflow: `open → in_progress → resolved → delivered`
- **purchases** → `ticket_id` (spare parts / replacement equipment linked to a repair)
- **profiles** → extends `auth.users` via same UUID; holds `role` and `branch_id`

## Environment Variables

Required in `.env`:
```
PORT
NODE_ENV
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL          # Supabase Postgres connection string
SESSION_SECRET
```

## Database Changes

Always create a new migration file rather than editing existing ones:
```bash
npx knex migrate:make <migration_name>
npm run migrate
```

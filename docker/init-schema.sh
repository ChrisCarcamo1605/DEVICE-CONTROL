#!/bin/bash
set -e
# supabase_vault is not available in plain Postgres — strip it before running
sed '/supabase_vault/d' /init.sql | psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"

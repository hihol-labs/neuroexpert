#!/bin/bash
set -e

# Supabase required roles and schemas
# Uses POSTGRES_PASSWORD from environment

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  -- Roles
  DO \$\$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
      CREATE ROLE anon NOLOGIN NOINHERIT;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
      CREATE ROLE authenticated NOLOGIN NOINHERIT;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
      CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
      CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '${POSTGRES_PASSWORD}';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
      CREATE ROLE supabase_auth_admin NOLOGIN NOINHERIT CREATEROLE;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
      CREATE ROLE supabase_storage_admin NOLOGIN NOINHERIT CREATEROLE;
    END IF;
  END \$\$;

  -- Grant membership
  GRANT anon TO authenticator;
  GRANT authenticated TO authenticator;
  GRANT service_role TO authenticator;
  GRANT supabase_auth_admin TO postgres;
  GRANT supabase_storage_admin TO postgres;

  -- Set passwords
  ALTER ROLE authenticator WITH PASSWORD '${POSTGRES_PASSWORD}';
  ALTER ROLE supabase_auth_admin WITH PASSWORD '${POSTGRES_PASSWORD}' LOGIN;
  ALTER ROLE supabase_storage_admin WITH PASSWORD '${POSTGRES_PASSWORD}' LOGIN;

  -- Schemas
  CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
  CREATE SCHEMA IF NOT EXISTS storage AUTHORIZATION supabase_storage_admin;
  CREATE SCHEMA IF NOT EXISTS extensions;

  -- Auth and Storage need CREATE on public schema for migrations
  GRANT CREATE ON SCHEMA public TO supabase_auth_admin;
  GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
  GRANT CREATE ON SCHEMA public TO supabase_storage_admin;
  GRANT USAGE ON SCHEMA public TO supabase_storage_admin;

  -- Storage needs CREATE on database for extensions
  GRANT CREATE ON DATABASE postgres TO supabase_storage_admin;
  GRANT CREATE ON DATABASE postgres TO supabase_auth_admin;

  -- Extensions
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
  CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
  CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA extensions;

  -- Grant usage
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
  GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
EOSQL

-- ============================================================
-- Cloud Storage App — Supabase (Postgres) schema
-- Run this once in the Supabase SQL Editor (or via psql).
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- USERS ----------
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password text not null,
  role text not null default 'USER' check (role in ('USER', 'ADMIN')),
  verified boolean not null default false,
  banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- FILES ----------
create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  original_name text,
  mime_type text,
  resource_type text,
  url text not null,
  public_id text not null,
  size bigint not null default 0,
  owner uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh on update.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_set_updated_at on users;
create trigger users_set_updated_at
  before update on users
  for each row execute function set_updated_at();

drop trigger if exists files_set_updated_at on files;
create trigger files_set_updated_at
  before update on files
  for each row execute function set_updated_at();

-- ---------- INDEXES ----------
create index if not exists files_owner_idx on files (owner);
create index if not exists files_owner_created_at_idx on files (owner, created_at desc);
create index if not exists users_role_idx on users (role);
create index if not exists users_banned_idx on users (banned);
-- Untuk ORDER BY created_at DESC di daftar admin.
create index if not exists users_created_at_idx on users (created_at desc);

-- ---------- LOCK DOWN THE PUBLIC API ----------
-- This app talks to Postgres directly (see lib/db.ts) and enforces access in the
-- API routes, so Supabase's auto-generated PostgREST API must not expose these
-- tables. Without this, anyone holding the public anon key could read `users`,
-- password hashes included.
--
-- RLS with zero policies denies every anon/authenticated request. The table
-- owner (`postgres`, the role in DATABASE_URL) bypasses RLS, so the app is
-- unaffected.
alter table users enable row level security;
alter table files enable row level security;

revoke all on table users from anon, authenticated;
revoke all on table files from anon, authenticated;

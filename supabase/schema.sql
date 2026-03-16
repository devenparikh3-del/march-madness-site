create extension if not exists pgcrypto;

create table if not exists competitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  title text not null,
  subtitle text not null,
  signup_url text not null default '',
  venmo_handle text not null default '',
  buy_in_amount numeric(10,2) not null default 10,
  update_note text not null default '',
  sheet_url text not null default '',
  disclaimer text not null default 'Not affiliated with PwC and not created using PwC resources.',
  region_names text[] not null default array['Region 1', 'Region 2', 'Region 3', 'Region 4'],
  theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  competition_slug text not null references competitions(slug) on delete cascade,
  slot_number integer not null,
  region_index integer not null,
  seed integer not null,
  name text not null,
  logo_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (competition_slug, slot_number)
);

create table if not exists match_winners (
  id uuid primary key default gen_random_uuid(),
  competition_slug text not null references competitions(slug) on delete cascade,
  game_id text not null,
  winner_slot integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (competition_slug, game_id)
);

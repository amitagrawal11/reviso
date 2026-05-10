-- Run this in Supabase SQL editor once.
-- Idempotent: safe to re-run when columns are added.

create extension if not exists "pgcrypto";

create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  parent_id   uuid references public.notes(id) on delete cascade,
  title       text not null,
  content     text not null default '',
  is_folder   boolean not null default false,
  icon        text not null default '📄',
  starred     boolean not null default false,
  trashed     boolean not null default false,
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Idempotent column adds for existing installs.
alter table public.notes add column if not exists icon    text    not null default '📄';
alter table public.notes add column if not exists starred boolean not null default false;
alter table public.notes add column if not exists trashed boolean not null default false;

create index if not exists notes_user_idx    on public.notes(user_id);
create index if not exists notes_parent_idx  on public.notes(parent_id);
create index if not exists notes_trashed_idx on public.notes(trashed);

-- Auto-set user_id on insert from the authenticated session — clients never
-- need to (and shouldn't be able to) forge it.
create or replace function public.set_user_id_on_notes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists notes_set_user_id on public.notes;
create trigger notes_set_user_id
  before insert on public.notes
  for each row execute function public.set_user_id_on_notes();

-- Auto-touch updated_at on update.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists notes_touch_updated_at on public.notes;
create trigger notes_touch_updated_at
  before update on public.notes
  for each row execute function public.touch_updated_at();

-- Row-level security — every user only sees & touches their own rows.
alter table public.notes enable row level security;

drop policy if exists "own notes select" on public.notes;
drop policy if exists "own notes insert" on public.notes;
drop policy if exists "own notes update" on public.notes;
drop policy if exists "own notes delete" on public.notes;

create policy "own notes select" on public.notes for select using (auth.uid() = user_id);
create policy "own notes insert" on public.notes for insert with check (auth.uid() is not null);
create policy "own notes update" on public.notes for update using (auth.uid() = user_id);
create policy "own notes delete" on public.notes for delete using (auth.uid() = user_id);

-- Realtime stream so other tabs / devices update instantly.
alter publication supabase_realtime add table public.notes;

-- ─── Profiles ───────────────────────────────────────────────────────────────
-- One row per auth user. Holds display name (and any future profile fields
-- like avatar_url, bio, etc.). Auto-populated via trigger from signUp metadata.

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '',
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "own profile select" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
drop policy if exists "own profile insert" on public.profiles;

create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);

-- When a new auth user is created, copy the `full_name` we sent in signUp's
-- `options.data` into a profiles row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_profile_updated_at();

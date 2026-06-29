-- =====================================================================
-- CPE Hardhatting 2026 — database schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- DIRECTORY: the pre-loaded roster (names + assigned seats per block).
-- Names are split (surname / first_name / middle_initial) so registration
-- can match a (surname, first name, block) tuple. `is_president` marks the
-- block president. A row is "claimed" once a real account registers it.
-- ---------------------------------------------------------------------
create table if not exists public.directory (
  id             uuid primary key default gen_random_uuid(),
  surname        text not null,
  first_name     text not null,
  middle_initial text,
  block          text not null,
  seat           text,                      -- null = no assigned seat (TBA)
  email          text,                      -- pre-registered email (from the class directory)
  is_president   boolean not null default false,
  claimed_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  full_name      text generated always as (
                    surname || ', ' || first_name ||
                    coalesce(' ' || middle_initial, '')
                  ) stored
);

-- match key: (surname, first name, block) is unique + case-insensitive
create unique index if not exists directory_match_key
  on public.directory (lower(surname), lower(first_name), block);

-- ---------------------------------------------------------------------
-- PROFILES: one row per registered user, linked to a directory record.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  directory_id uuid references public.directory (id),
  full_name    text not null,
  block        text,
  seat         text,
  email        text,
  role         text not null default 'attendee'
                 check (role in ('attendee','president','scanner','admin')),
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- VALIDATE REGISTRATION (called by the form BEFORE sign-up; anon-safe).
-- Returns status = ok | not_found | already_claimed
-- President status is taken automatically from the directory record.
-- ---------------------------------------------------------------------
create or replace function public.validate_registration(
  p_surname    text,
  p_first_name text,
  p_block      text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  rec public.directory;
begin
  select * into rec
  from public.directory
  where lower(surname) = lower(trim(p_surname))
    and lower(first_name) = lower(trim(p_first_name))
    and block = p_block
  limit 1;

  if rec.id is null then
    return jsonb_build_object('status','not_found');
  end if;
  if rec.claimed_by is not null then
    return jsonb_build_object('status','already_claimed');
  end if;

  return jsonb_build_object(
    'status','ok', 'full_name', rec.full_name,
    'seat', rec.seat, 'is_president', rec.is_president
  );
end; $$;

-- ---------------------------------------------------------------------
-- CLAIM DIRECTORY (called AFTER the user confirms their email / OTP).
-- Reads the signed-in user's metadata (set at sign-up), re-validates,
-- atomically marks the directory row claimed, and creates the profile.
-- ---------------------------------------------------------------------
create or replace function public.claim_directory()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid    uuid := auth.uid();
  meta   jsonb;
  rec    public.directory;
  v_role text;
begin
  if uid is null then
    return jsonb_build_object('status','unauthenticated');
  end if;

  select raw_user_meta_data into meta from auth.users where id = uid;

  update public.directory d
     set claimed_by = uid
   where lower(d.surname) = lower(trim(meta->>'surname'))
     and lower(d.first_name) = lower(trim(meta->>'first_name'))
     and d.block = meta->>'block'
     and (d.claimed_by is null or d.claimed_by = uid)
  returning * into rec;

  if rec.id is null then
    return jsonb_build_object('status','failed');
  end if;

  -- president is decided by the directory, not the user
  v_role := case when rec.is_president then 'president' else 'attendee' end;

  insert into public.profiles (id, directory_id, full_name, block, seat, email, role)
  values (uid, rec.id, rec.full_name, rec.block, rec.seat,
          (select email from auth.users where id = uid), v_role)
  on conflict (id) do update
    set directory_id = excluded.directory_id, full_name = excluded.full_name,
        block = excluded.block, seat = excluded.seat, role = excluded.role;

  return jsonb_build_object('status','ok','seat',rec.seat,'role',v_role);
end; $$;

-- ---------------------------------------------------------------------
-- ROW-LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.directory enable row level security;
alter table public.profiles  enable row level security;

drop policy if exists directory_select_own on public.directory;
create policy directory_select_own on public.directory
  for select to authenticated using (claimed_by = auth.uid());

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid());

-- staff (set role manually) may read everything.
-- NOTE: the staff check MUST go through this SECURITY DEFINER helper. Inlining
-- `exists (select 1 from public.profiles ...)` in a profiles policy causes
-- "infinite recursion detected in policy for relation profiles". The helper
-- runs as the table owner and bypasses RLS, so there is no recursion.
create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','scanner')
  );
$$;
grant execute on function public.is_staff() to authenticated;

drop policy if exists profiles_select_staff on public.profiles;
create policy profiles_select_staff on public.profiles
  for select to authenticated using (public.is_staff());

drop policy if exists directory_select_staff on public.directory;
create policy directory_select_staff on public.directory
  for select to authenticated using (public.is_staff());

grant execute on function public.validate_registration(text, text, text) to anon, authenticated;
grant execute on function public.claim_directory() to authenticated;

-- =====================================================================
-- SEED (placeholder) — replace with the real directory. Example:
-- insert into public.directory (surname, first_name, middle_initial, block, seat, is_president) values
--   ('Almanza','Juan Rafael','S.','BSCPE 2-1','A1', false),
--   ('Santos','Maria','C.','BSCPE 2-1','A2', true);  -- block president
-- =====================================================================

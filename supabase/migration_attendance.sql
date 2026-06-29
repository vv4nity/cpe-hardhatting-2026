-- =====================================================================
-- CPE Hardhatting 2026 — migration: attendance, check-in, seat layout
-- Run this AFTER schema.sql + seed.sql. Safe to re-run.
-- =====================================================================

-- 1) Attendance fields on the directory (each seat has a live status)
alter table public.directory
  add column if not exists status text not null default 'assigned',
  add column if not exists checked_in_at timestamptz,
  add column if not exists gate text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'directory_status_chk') then
    alter table public.directory add constraint directory_status_chk
      check (status in ('assigned','present','no-show','flagged'));
  end if;
end $$;

-- 2) Names-free SEAT LAYOUT (every seat's section + status, NO names).
--    Owned by the definer so it bypasses directory RLS — safe because it
--    exposes no personal data. Lets attendees see the venue layout.
create or replace view public.seat_layout as
  select seat, block, status, is_president from public.directory;
grant select on public.seat_layout to anon, authenticated;

-- 3) CHECK-IN (scanner/admin only): mark a seat present, record time + gate.
create or replace function public.check_in(p_seat text, p_gate text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  caller_role text;
  rec public.directory;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is null or caller_role not in ('scanner','admin') then
    return jsonb_build_object('status','forbidden');
  end if;

  select * into rec from public.directory where upper(seat) = upper(trim(p_seat)) limit 1;
  if rec.id is null then
    return jsonb_build_object('status','invalid');
  end if;
  if rec.status = 'present' then
    return jsonb_build_object('status','duplicate','full_name',rec.full_name,
      'seat',rec.seat,'block',rec.block,'checked_in_at',rec.checked_in_at);
  end if;

  update public.directory
     set status = 'present', checked_in_at = now(), gate = p_gate
   where id = rec.id
  returning * into rec;

  return jsonb_build_object('status','success','full_name',rec.full_name,
    'seat',rec.seat,'block',rec.block,'checked_in_at',rec.checked_in_at);
end; $$;
grant execute on function public.check_in(text, text) to authenticated;

-- 4) STAFF ROLE helper — set a user's role after you create them in the
--    dashboard (Authentication → Add user). Usage:
--      select public.set_staff_role('admin@cpehardhatting2026.com','admin');
--      select public.set_staff_role('scanner@cpehardhatting2026.com','scanner');
create or replace function public.set_staff_role(p_email text, p_role text)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if p_role not in ('admin','scanner') then
    raise exception 'role must be admin or scanner';
  end if;
  select id into uid from auth.users where lower(email) = lower(p_email);
  if uid is null then
    return 'no auth user with email ' || p_email || ' — create them first';
  end if;
  insert into public.profiles (id, full_name, email, role)
  values (uid, initcap(p_role) || ' Console', p_email, p_role)
  on conflict (id) do update set role = excluded.role;
  return 'ok: ' || p_email || ' is now ' || p_role;
end; $$;

-- 5) Realtime for live dashboards (admin/scanner subscribe to attendance)
do $$ begin
  begin
    alter publication supabase_realtime add table public.directory;
  exception when duplicate_object then null;
  end;
end $$;

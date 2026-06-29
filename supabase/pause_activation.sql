-- =====================================================================
-- Activation pause switch.
-- Lets organizers temporarily CLOSE account activation (e.g. while fixing
-- an issue), then reopen it later. Enforced in activate_account() so it
-- can't be bypassed. Run once; toggle from the admin Invitations page after.
-- =====================================================================

create table if not exists public.app_settings (
  key   text primary key,
  value text not null
);
alter table public.app_settings enable row level security;

drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings
  for select to anon, authenticated using (true);

-- start CLOSED (you're fixing an issue). Set to 'true' to reopen.
insert into public.app_settings (key, value) values ('activation_open', 'false')
  on conflict (key) do update set value = excluded.value;

-- public read of the flag (defaults to open if the row is missing)
create or replace function public.activation_open()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select value = 'true' from public.app_settings where key = 'activation_open'),
    true
  );
$$;
grant execute on function public.activation_open() to anon, authenticated;

-- staff-only setter (used by the admin toggle)
create or replace function public.set_activation_open(p_open boolean)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'not authorized';
  end if;
  insert into public.app_settings (key, value)
  values ('activation_open', case when p_open then 'true' else 'false' end)
  on conflict (key) do update set value = excluded.value;
  return p_open;
end; $$;
grant execute on function public.set_activation_open(boolean) to authenticated;

-- re-create activate_account WITH the pause guard at the top
create or replace function public.activate_account(
  p_surname    text,
  p_first_name text,
  p_block      text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid          uuid := auth.uid();
  caller_email text;
  rec          public.directory;
  v_role       text;
begin
  if not public.activation_open() then
    return jsonb_build_object('status','closed');
  end if;

  if uid is null then
    return jsonb_build_object('status','unauthenticated');
  end if;

  select email into caller_email from auth.users where id = uid;

  select * into rec
  from public.directory
  where lower(surname) = lower(trim(p_surname))
    and lower(first_name) = lower(trim(p_first_name))
    and block = p_block
  limit 1;

  if rec.id is null then
    return jsonb_build_object('status','not_found');
  end if;
  if rec.email is null or lower(rec.email) <> lower(coalesce(caller_email, '')) then
    return jsonb_build_object('status','email_mismatch');
  end if;
  if rec.claimed_by is not null and rec.claimed_by <> uid then
    return jsonb_build_object('status','already_claimed');
  end if;

  update public.directory set claimed_by = uid where id = rec.id returning * into rec;

  v_role := case when rec.is_president then 'president' else 'attendee' end;

  insert into public.profiles (id, directory_id, full_name, block, seat, email, role)
  values (uid, rec.id, rec.full_name, rec.block, rec.seat, caller_email, v_role)
  on conflict (id) do update
    set directory_id = excluded.directory_id, full_name = excluded.full_name,
        block = excluded.block, seat = excluded.seat, role = excluded.role;

  return jsonb_build_object('status','ok','seat',rec.seat,'role',v_role);
end; $$;

grant execute on function public.activate_account(text, text, text) to authenticated;

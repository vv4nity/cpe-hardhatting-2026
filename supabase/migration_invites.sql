-- =====================================================================
-- CPE Hardhatting 2026 — migration: invite-based onboarding
-- Run AFTER schema.sql + seed.sql + migration_attendance.sql. Safe to re-run.
--
-- Flow: admin sends an invite to each directory email -> attendee opens the
-- link (gets a session) -> confirms Surname + First name + Block + sets a
-- password -> account activated. activate_account() does the verify + claim.
-- =====================================================================

-- track when an invite was last sent (lets the admin re-send to stragglers)
alter table public.directory
  add column if not exists invited_at timestamptz;

-- ---------------------------------------------------------------------
-- ACTIVATE ACCOUNT — called by /activate while the invited user has a
-- session. Matches Surname + First name + Block against the directory,
-- requires the matched row's email to equal the signed-in (invited) email,
-- then claims the seat and creates the profile (president taken from the
-- directory, never self-selected).
-- Returns status = ok | not_found | email_mismatch | already_claimed | unauthenticated
-- ---------------------------------------------------------------------
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

  -- the matched record must belong to the email this invite was sent to
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

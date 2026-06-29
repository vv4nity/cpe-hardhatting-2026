-- =====================================================================
-- FIX: infinite recursion in the staff RLS policies.
--
-- The original `profiles_select_staff` / `directory_select_staff` policies
-- did `exists (select 1 from public.profiles ...)`. Evaluating that subquery
-- re-triggers the very same policy on `profiles`, so Postgres aborts every
-- read with: "infinite recursion detected in policy for relation profiles".
-- That made the post-login profile lookup fail → no session → homepage bounce.
--
-- The fix: a SECURITY DEFINER helper that checks the role while BYPASSING RLS
-- (it runs as the table owner), so the policy no longer recurses.
-- Run this once in the SQL Editor. Safe to re-run.
-- =====================================================================

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

-- staff may read every profile
drop policy if exists profiles_select_staff on public.profiles;
create policy profiles_select_staff on public.profiles
  for select to authenticated using (public.is_staff());

-- staff may read the whole directory
drop policy if exists directory_select_staff on public.directory;
create policy directory_select_staff on public.directory
  for select to authenticated using (public.is_staff());

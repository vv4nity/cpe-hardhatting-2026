-- =====================================================================
-- Self-service email-change requests (admin-approved) + rate limiting.
-- Run once in the SQL Editor. Safe to re-run.
-- =====================================================================

-- Student-submitted email corrections, queued for admin approval.
create table if not exists public.email_change_requests (
  id             uuid primary key default gen_random_uuid(),
  directory_id   uuid not null references public.directory (id) on delete cascade,
  requested_email text not null,
  status         text not null default 'pending'
                   check (status in ('pending', 'approved', 'rejected')),
  created_at     timestamptz not null default now()
);
alter table public.email_change_requests enable row level security;

-- staff may read the queue (writes happen via the service key only)
drop policy if exists ecr_staff_read on public.email_change_requests;
create policy ecr_staff_read on public.email_change_requests
  for select to authenticated using (public.is_staff());

create index if not exists ecr_status_idx
  on public.email_change_requests (status, created_at desc);

-- Rate-limit event log. RLS on with NO policies → only the service key can
-- touch it (the secret key bypasses RLS).
create table if not exists public.rate_limits (
  id         uuid primary key default gen_random_uuid(),
  bucket     text not null,
  created_at timestamptz not null default now()
);
alter table public.rate_limits enable row level security;

create index if not exists rate_limits_bucket_idx
  on public.rate_limits (bucket, created_at desc);

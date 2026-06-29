# Supabase setup (CPE Hardhatting 2026)

The real registration/login + database run on **Supabase**. Follow these steps,
then send me the 3 keys and the directory data so I can finish + verify the flow.

## 1. Create the project

1. Go to <https://supabase.com> → sign in → **New project** (free tier is fine).
2. Pick a name + a strong database password, choose the region closest to PH
   (e.g. Singapore), and create it.

## 2. Create the tables

1. In the project: **SQL Editor → New query**.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql) and
   click **Run**. This creates the `directory` + `profiles` tables, the
   registration rules, and Row-Level Security. (Safe to re-run.)

## 3. Turn on email confirmation (OTP)

- **Authentication → Providers → Email**: enable **Confirm email**.
- **Authentication → Email Templates → Confirm signup**: make sure the template
  contains the code token `{{ .Token }}` (so users get a **6-digit code**, not
  just a link).
- The free tier's built-in email is rate-limited; for real volume add an SMTP
  provider under **Authentication → SMTP Settings** (e.g. Resend/Gmail SMTP).

## 4. Get the keys

**Project Settings → API**, then copy into a local `.env.local`
(see [`.env.local.example`](.env.local.example)):

| Env var | Where |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (server-only, for seeding) |

Add the same 3 vars in **Vercel → Settings → Environment Variables** for deploys.

## 5. Send me

1. The `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (these are public/safe). Keep the **service-role key private** — I only need
   it set in your env for the seed step.
2. The **seat plan + directory per block** (names + assigned seats, and who the
   block president is). I'll turn it into a seed script that fills `directory`.

## What happens after

Once the project is up and the directory is seeded, I'll build + verify:

- **Register** — email + full name + block (+ president checkbox). Validated
  against the directory (must be on the list; president only if recorded as one;
  no duplicates) → **email OTP** → set password.
- **Login** — email + password → view assigned seat + seat plan + details.

> Until the env vars are set, the app keeps running the front-only demo; the new
> auth simply isn't active yet.

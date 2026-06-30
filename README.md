# CPE Hardhatting 2026 — Attendance & QR Seating

The attendance, onboarding, and QR-seating platform for the **PUP CpE
Hardhatting Ceremony 2026** (Bulwagang Balagtas, July 1, 2026). Each attendee
gets a reserved seat and a personal QR pass (savable as a PNG); staff scan
passes at the door and organizers watch attendance fill the hall live.

Built with **Next.js 16 (App Router, Turbopack) · React 19 · TypeScript ·
Tailwind CSS v4 · shadcn-style UI**, backed by **Supabase** (Postgres + Auth +
Realtime + RLS) and **Gmail SMTP** for transactional email. Deployed on Vercel.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

Copy `.env.example` → `.env.local` and fill in the Supabase and Gmail values.
See [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) for database setup and
[`HOW-IT-WORKS.md`](HOW-IT-WORKS.md) for an end-to-end walkthrough.

## Roles & screens

| Role | What they get |
| --- | --- |
| **Attendee** | Dashboard (event facts + QR) · My QR · Seating map ("You are here") · Profile · Save pass as PNG |
| **Block President** | + Block Oversight (their block's roster & stats) |
| **Scanner** | Full-screen `/scanner`: live camera QR, manual entry, **offline-resilient** check-in, scan-result feedback |
| **Admin** | Overview (live metrics, realtime check-in chart, activity, block table) · Seating Map · **Invitations console** · Import/Export |

## Key features

### Invite-based onboarding
Attendees never self-register. Organizers send branded invitation emails from the
**Invitations console**; each links to `/activate`, where the attendee confirms
their identity against the official class directory (surname + first name +
block) and sets a password. On success they see an **"Account activated"** screen
and sign in with their new credentials. Identity mismatches and already-claimed
seats are rejected server-side.

### Invitations console (admin)
- **Live per-recipient send status** with batched sending (avoids serverless
  timeouts) and a progress panel.
- **Clickable Registered / Pending counts** drill into a searchable roster with
  per-person **Resend** and **Edit email** actions.
- **Fix-email form** to correct a single address and auto-resend.
- **Email-change requests** card (always visible) to **approve/reject**
  attendee-submitted corrections.
- **Pause / reopen activation** toggle for maintenance windows.

### Self-service recovery (public, rate-limited)
- **"Didn't get your invitation?"** (`/no-invite`) — match name + block against
  the directory, request an email correction; **admin-approved** before resend.
- **Forgot password** (`/forgot-password`) — branded Supabase recovery email.
- Both are **DB-backed rate-limited** (1 / 2 min, 5 / hour per IP+email).

### Offline-resilient scanner
QR decoding and attendee lookup run **entirely in-browser** (roster is loaded
into memory at sign-in), so passes are recognized with **no signal**. Check-ins
that can't reach the server are **queued in localStorage** and synced
automatically. Sync is triggered three ways for flaky-signal venues:
- on the browser's `online` event,
- **every 20s** while a backlog exists, and
- **after any successful online scan** (proves connectivity is back).

A `syncingRef` lock prevents double-posting; failed items stay queued and retry.
Synced check-ins flow to the admin dashboard **live via Supabase Realtime**.

### Digital pass
Each attendee has a personal QR pass (`HHC2026:<id>:<seat>`) shown on the
dashboard and `/qr`. They can **Save as PNG** — a high-resolution, fully
client-side render of the ticket (event hero, attendee details, perforation, QR
stub via canvas in `src/lib/pass-image.ts`) that works offline once saved to the
phone's gallery.

### Branded email
Premium invitation template (event cover, League Gothic headline, Hanken
Grotesk body, partner-logo footer, dress-code link) sent via Gmail SMTP with
CID-inlined assets. Mobile-first with light/dark-safe rendering.

## Architecture

```
src/
  app/
    (auth)/                  # signin · activate · no-invite · forgot/reset-password
    (app)/                   # authenticated shell (nav + guard)
      dashboard|qr|seating|oversight|profile
      admin/overview|seating|import|invitations
    scanner/                 # full-screen scanner (own guard)
    auth/confirm/            # Supabase link → session exchange
    api/
      admin/                 # invite · fix-email · recipients · activation · email-requests
      public/                # email-request · forgot-password
  components/
    ui/ app/ brand/ seating/ scanner/ auth/ admin/
  lib/
    store.ts                 # Zustand store (session + scanner + UI)
    supabase/                # browser/server/admin clients, proxy, refresh
    checkin.ts               # seatFromScan · checkInSeat · flushQueue (offline queue)
    email/                   # invite · invite-one · reset templates
    pass-image.ts            # canvas render of the QR ticket → PNG
    rate-limit.ts            # DB-backed limiter
    views.ts | format.ts | nav.ts | status.ts | types.ts
```

Supabase access is layered: an SSR browser/server client for user sessions
(RLS-enforced) and a secret-key admin client for privileged API routes
(`requireAdmin()` guard). Privileged DB logic lives in `SECURITY DEFINER`
functions (`activate_account`, `check_in`, `activation_open`) called via RPC.
Realtime subscriptions on the `directory` table keep staff/admin views live.

## Database setup

SQL migrations live in [`supabase/`](supabase/) and are applied in the Supabase
SQL Editor:

- core schema + seed (directory, profiles, RPCs) — see `SUPABASE_SETUP.md`
- `pause_activation.sql` — `app_settings` + activation toggle
- `migration_requests.sql` — `email_change_requests` + `rate_limits` tables

Secrets (`.env.local`, service-account keys, seed/staff credentials) are
gitignored and configured per-environment (Vercel project settings in prod).

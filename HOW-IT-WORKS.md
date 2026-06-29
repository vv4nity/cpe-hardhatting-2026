# CPE Hardhatting 2026 — How the System Works

An attendance + QR seating platform for the CpE Hardhatting Ceremony 2026.
Attendees get a personal invite, activate an account, and receive a digital
seat pass with a QR code. Staff scan those codes at the gate, and the admin
watches attendance update live.

---

## 1. The people (roles)

Every account has exactly one role. The role is decided **automatically** — no
one picks it.

| Role | Who | What they can do |
|------|-----|------------------|
| **Attendee** | A 2nd-year student in the class directory | View their own seat, digital QR pass, and the venue section layout |
| **President** | A block president (flagged in the directory) | Everything an attendee can, plus **Block Oversight** for their section |
| **Scanner** | Gate staff (one shared account) | Scan QR passes to check people in (works offline) |
| **Admin** | Organizers (one shared account) | Send invites, monitor live attendance, view the full seat map, export data |

Attendees see **only their own name** and seat. They can see where every seat
*is* (the section layout) but **not who sits there** — that's privacy by design.
Staff see everyone.

---

## 2. The attendee journey

```
Admin sends invite  →  Email arrives  →  Click "Activate"  →  Verify identity
      →  Set a password  →  Sign in anytime  →  Show QR pass at the gate
```

1. **Invitation** — The admin sends each student a personal email (branded,
   with the event details). It contains a one-time activation link.
2. **Activate** (`/activate`) — Clicking the link opens the activation page.
   The student confirms their **Surname + First name + Block** (matched against
   the official directory) and **sets a password**. Their seat is then claimed.
3. **Sign in** (`/signin`) — From then on they sign in with **email + password**.
4. **Their pass** — In the app they get:
   - **Dashboard** — their seat, block, and status at a glance.
   - **My QR Pass** — a digital ticket with a QR code. They can **Save as PNG**
     or **Add to Google Wallet**.
   - **Seating** — the venue map; their seat is highlighted, others are unnamed.
   - **Profile** — their details (read-only; they come from the directory).

> Registration is **invite-only**. There is no public sign-up — a student can
> only join from an invite tied to their directory email.

---

## 3. The gate (scanner)

The scanner signs in with the shared scanner account and gets a **single,
one-screen station**:

- **Start camera** and point it at an attendee's QR pass — or type a **seat
  number** manually if a code won't scan.
- Each scan shows a clear result card: **CHECKED IN** (green), **ALREADY IN**
  (amber, duplicate), or **INVALID** (red).
- A running tally shows **Scanned / Checked in / Duplicates**.

### Offline mode
The gate often has weak Wi-Fi, so the scanner is built to keep working:

- If the connection drops, the header shows **"Offline · N queued"** and scans
  are **saved locally** (the card says *CHECKED IN · OFFLINE*).
- When the connection returns, queued check-ins **sync automatically** and you
  get a "Synced N" confirmation.

Nothing is lost if the network is flaky.

---

## 4. The admin dashboard

- **Overview** — live metrics (registered, present, attendance %, no-shows) and
  an attendance-by-section breakdown. It **updates in real time** as the scanner
  checks people in (no refresh needed); a **Refresh** button forces a re-fetch.
- **Seating Map** — the full venue with every seat, colored by section or by
  status, searchable by name / seat / email.
- **Invitations** — send the activation emails:
  - Shows **With email / Registered / Pending** counts.
  - **"Send to N pending"** emails everyone not yet registered (safe to re-tap —
    it skips people who already activated).
  - A **Preview** box sends a sample email to any address without touching data.
- **Export** — download the current attendance as a CSV.

---

## 5. How it's built (technical)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) · React 19 · Tailwind CSS v4 |
| State | Zustand store, hydrated from the Supabase session |
| Backend / DB | Supabase (PostgreSQL + Auth + Realtime) |
| Email | Gmail SMTP via Nodemailer (no domain needed) |
| Wallet | Google Wallet "Add to Wallet" — signed save JWT |
| Hosting | Vercel |

### Data model (Supabase)
- **`directory`** — the master roster (382 students): surname, first name,
  middle initial, block, **seat**, email, `is_president`, and live attendance
  fields (`status`, `checked_in_at`, `claimed_by`).
- **`profiles`** — one row per real account (id = auth user id), with the
  resolved **role** and a link to their directory record.
- **`seat_layout`** — a names-free view of every seat (so attendees can see the
  layout without seeing other students).

### Key database functions
- `validate_registration` / `activate_account` — verify a student against the
  directory and claim their seat.
- `check_in(seat)` — marks a seat present (scanner/admin only).
- `is_staff()` — a `SECURITY DEFINER` helper used by the row-level-security
  policies (staff see everything; attendees see only their own row).

### Security model
- **Row-Level Security** on every table: attendees can read only their own
  directory/profile row + the names-free `seat_layout`; staff read everything.
- Secrets (`SUPABASE_SECRET_KEY`, Gmail app password, Google Wallet key) live
  only in environment variables / gitignored files — never in the repo.
- The real student roster lives only in the database and the gitignored
  `supabase/seed.sql` — never committed.

---

## 6. Setup & deployment

### Environment variables (`.env.local` locally, Vercel project settings live)
```
NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # publishable key
SUPABASE_SECRET_KEY               # secret key (server only)
GMAIL_USER                        # the sending Gmail
GMAIL_APP_PASSWORD                # 16-char Google App Password
INVITE_FROM_EMAIL                 # "CPE Hardhatting 2026 <...@gmail.com>"
GOOGLE_WALLET_ISSUER_ID           # from Google Wallet console
GOOGLE_WALLET_SA_JSON             # service-account key JSON (live)  — OR
GOOGLE_WALLET_SA_KEY_FILE         # ./google-wallet-key.json (local only)
```

### Database setup (run once, in order, in the Supabase SQL Editor)
1. `supabase/schema.sql` — tables, functions, RLS
2. `supabase/seed.sql` — the 382 students (gitignored; PII)
3. `supabase/migration_attendance.sql` — check-in + realtime
4. `supabase/migration_invites.sql` — invite-based onboarding
5. `supabase/fix_rls_recursion.sql` — the staff-policy fix

Then create the two staff accounts in **Authentication → Users** (auto-confirm)
and run `select public.set_staff_role(...)` for each.

---

## 7. Event-day runbook

**Before the event**
1. Confirm all env vars are set on Vercel and the site loads.
2. In **Admin → Invitations**, send the invites (do a Preview test first).
3. Spot-check that a test invite arrives and activation works.

**At the gate**
1. Open the live site, sign in as **scanner**, tap **Start camera**.
2. Scan each attendee's QR pass (or type their seat). Listen for the beep.
3. If Wi-Fi drops, keep scanning — it queues and syncs automatically.

**Monitoring**
1. Sign in as **admin → Overview** on a laptop.
2. Watch attendance climb live; use **Seating Map** to find specific people.
3. **Export** the CSV afterward for records.

---

## 8. Useful resets (admin, via SQL Editor)

```sql
-- reset a single seat (undo a test check-in)
update public.directory set status='assigned', checked_in_at=null where seat='A1';

-- reset ALL attendance to a clean pre-event state
update public.directory set status='assigned', checked_in_at=null, gate=null;
```

---

*Built for ACCESS · PUP CpE Department · ICPEP SE - PUP.*

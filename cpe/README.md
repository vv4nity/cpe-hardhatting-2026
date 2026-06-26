# Hardhatting 2026 — Attendance & QR Seating

A modernized rebuild of the *Hardhatting Ceremony 2026* attendance & QR seating
management system. Originally a single bundled HTML file (a custom React +
`{{ }}` templating runtime with inline styles); now a **Next.js (App Router) +
React 19 + TypeScript + Tailwind CSS v4 + shadcn-style UI** application.

> **Front-only demo.** All data is deterministically generated in-memory and the
> magic-link sign-in is simulated. The data and auth layers are isolated behind
> seams (`src/lib/data/source.ts`, `src/lib/auth.ts`) so a real backend
> (passwordless auth + database) can be dropped in without touching the screens.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Roles & screens

Sign in from `/login` and pick a demo role:

| Role | Routes |
| --- | --- |
| **Attendee** | Dashboard · My QR · Seating · Profile |
| **Block President** | + Block Oversight (roster & block stats) |
| **Scanner** | Full-screen `/scanner`: live camera QR (Html5Qrcode), manual + simulated scans, scan-result modal |
| **Admin** | Overview (metrics, check-in chart, live activity, block table) · Seating Map (search/filter/zoom) · Import & Export (CSV) |

## Architecture

```
src/
  app/                     # App Router routes
    (auth)/login/          # magic-link + demo role picker
    (app)/                 # authenticated shell (nav + guard)
      dashboard|qr|seating|oversight|profile
      admin/overview|seating|import
    scanner/               # full-screen scanner (own guard)
  components/
    ui/                    # shadcn-style primitives (Radix + Tailwind)
    app/                   # shell, nav, auth gate, page header
    brand/                 # logo / wordmark
    seating/               # seat map + selected-seat panel
    scanner/               # scanner screen + scan-result dialog
  lib/
    store.ts               # Zustand store (session + UI + actions)
    data/                  # deterministic mock dataset + data-source seam
    auth.ts                # mock magic-link / role resolution
    views.ts               # derived data (metrics, chart, roster, blocks)
    status.ts | format.ts | nav.ts | types.ts
```

State lives in a single Zustand store; the session is persisted to
`localStorage` (rehydrated client-side to avoid SSR mismatches). The mock
dataset (500 seats across Blocks A–E) is generated from a seeded PRNG so server
and client render identical data.

## Replacing the mock backend later

- **Data:** swap the body of `loadDataset()` in `src/lib/data/source.ts` for a
  fetch; callers keep the same `Dataset` shape.
- **Auth:** replace `resolveDemoUser()` in `src/lib/auth.ts` and the login page's
  send/verify steps with real magic-link calls; the rest depends only on the
  returned `SessionUser`.

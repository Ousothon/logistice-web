# Cargo Bridge — Logistics Frontend

Frontend build for the China → Cambodia cross-border logistics system, built
from your System Blueprint. Every module in the sidebar (all 30 list screens
across Operations, Cambodia, Customers, Warehouse, Management and System,
plus the Dashboard) is a real, working page — filter bar, table, status
badges, and mock data shaped like the blueprint's entities (Customer ID, TK,
Shipment, Container...). **Auth + Customer registration are now wired to
real Supabase** (Auth + a `customers` table with an auto-generated Customer
ID); every other module still reads mock data — see "What's still mock"
below.

## Stack
- React 18 + Vite
- React Router (routing)
- Tailwind CSS (styling, custom design tokens in `tailwind.config.js`)
- lucide-react (icons)
- `@supabase/supabase-js` — powers real Auth + the `customers` table
  (`src/lib/supabaseClient.js`); every other module still reads mock data

## Getting started

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Connecting Supabase

The app runs fine with **no Supabase configured** — it falls back to a mock
login/register (any email + password) and mock tables everywhere. To switch
Login, Register, and the `customers` table over to a real backend:

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** in your project, paste in `supabase/schema.sql`, and
   run it. This creates the `customers` table, the `KH-XXXXXX` Customer ID
   generator (a sequence + trigger — see the file's comments), and Row Level
   Security policies so each customer only sees their own row.
3. In **Authentication → Providers**, make sure Email is enabled. For local
   testing, turning **off** "Confirm email" under Authentication → Settings
   lets a new signup log straight in instead of waiting on a confirmation
   email (leave it on for production).
4. Copy `.env.example` to `.env` and fill in your project's URL + anon key
   (Project Settings → API).
5. Restart `npm run dev`. `src/lib/supabaseClient.js` picks up the env vars
   automatically — `AuthContext` (Login, Register) starts using real
   `supabase.auth` calls with no other code changes.

For every other module (Orders, Packages, Shipments...), the rest of the
blueprint's Database Structure (section 36) is listed at the bottom of
`supabase/schema.sql` as a reference for later migrations. To wire one up:
add its table with a migration like the customers one, then replace the
mock arrays:
   - Dashboard: `STATS`, `RECENT`, `EXCEPTIONS` at the top of `src/pages/Dashboard.jsx`
   - Every list module: the `rows` (and `stats`) array for that route's
     entry in `src/lib/modules.js`
   - TK / Container detail pages: `src/lib/details.js`

## Login & Registration

The whole app (except `/login` and `/register`) is behind `ProtectedRoute`.
- **Without Supabase configured:** any email + password on `/login` logs you
  in, and `/register` generates a mock `KH-XXXXXX` Customer ID — both kept in
  `localStorage`.
- **With Supabase configured:** `/login` calls `supabase.auth.signInWithPassword`;
  `/register` calls `supabase.auth.signUp`, then inserts a row into
  `customers` and reads back the real, trigger-generated Customer ID. If your
  project requires email confirmation, registration shows a "check your
  email" screen instead of the Customer ID/QR, and the `customers` row gets
  created on first login after confirming.

## Project structure

```
src/
  components/
    Layout.jsx        # sidebar + topbar shell, wraps all protected routes
    Sidebar.jsx        # nav, generated from lib/nav.js
    Topbar.jsx          # search, notifications, user dropdown + logout
    ProtectedRoute.jsx  # redirects to /login when there's no session
    StatCard.jsx        # dashboard / list-page metric card
    RouteFlow.jsx        # China → Cambodia pipeline hero visual
    ListPage.jsx          # reusable template: header + stats + filter bar + table
    DataTable.jsx          # generic table renderer
    StatusBadge.jsx         # color-coded status pill (keyword-based)
  pages/
    Login.jsx            # split-panel login screen
    Register.jsx           # customer self-registration (blueprint section 3)
    Dashboard.jsx        # hand-built page (route flow + activity + exceptions)
    PackageDetail.jsx     # /packages/:tk — tracking timeline + package info
    ContainerDetail.jsx    # /containers/:id — timeline + packages inside
    Placeholder.jsx      # fallback for any nav item with no module config
  context/
    AuthContext.jsx    # session state + signUp/login/logout;
                        # real Supabase Auth if configured, else a mock session
  lib/
    nav.js             # single source of truth for sidebar structure
    modules.js           # per-route config: title, stats, columns, mock rows
    details.js            # mock TK / Container detail records + timelines
    customerId.js           # mock Customer ID generator (fallback only)
    supabaseClient.js
supabase/
  schema.sql           # customers table + Customer ID trigger + RLS policies
```

### Customer registration

`/register` (linked from the login screen) mirrors the blueprint's Customer
Register flow: Name, Phone, Email, Password → generates a `KH-XXXXXX`
Customer ID (server-side, once Supabase is connected — see above), assigns a
default warehouse, and shows a decorative QR + copyable warehouse address
(recipient name embeds the Customer ID, per blueprint section 6) — ready to
paste into Taobao/1688/etc.

### Detail pages

Clicking a **TK Number** (in Packages, or on the Dashboard) opens
`/packages/:tk`; clicking a **Container No** opens `/containers/:id`. Both
read from `src/lib/details.js` — a handful of sample TKs/containers have full
mock timelines (`PACKAGE_DETAILS`, `CONTAINER_DETAILS`); any other ID falls
back to a generic "just started" timeline so the page never breaks. Any table
column can become a link the same way — pass `linkTo: (row) => path` in its
column definition (see `packages`/`containers` in `modules.js`).

### How a module page works

Every sidebar link except Dashboard looks itself up in `MODULES` (in
`src/lib/modules.js`) by path and renders `<ListPage {...config} />`. To add
real data, edit that route's `rows` (and `columns`/`stats` if the shape
changes) — the page itself never needs to change. Status text is colored
automatically by keyword (`StatusBadge.jsx`): "delivered/released/resolved" →
teal, "missing/damaged/failed/hold" → red, "pending/processing/transit" →
amber, "inbound/outbound/created" → blue.

## Design notes

- Palette: deep navy (`ink`) for the console/sidebar, a clear working blue for
  interactive elements, amber for in-progress states, teal for
  completed/cleared, red for exceptions — chosen for a control-tower feel
  rather than a generic light SaaS dashboard.
- Typography: Manrope for headings/brand, Inter for body and tabular data.
- The hero on the dashboard is the actual pipeline from the blueprint
  (Inbound → QC → Outbound → Transit → Arrival → Customs → Delivery)
  instead of a generic stat-card row, so it reflects this system's real flow.

## What's still mock / next steps

- Only `customers` (Auth + registration) talks to Supabase. Every list
  module, the Dashboard, and TK/Container detail pages still read mock data
  (`src/lib/modules.js`, `src/lib/details.js`) — see "Connecting Supabase"
  above for how to wire up the next table.
- Detail pages exist for TK and Container only — other list rows (Orders,
  Shipments, Customers...) aren't clickable yet.
- Registration doesn't yet distinguish "Staff Create" (blueprint section 3's
  other path, where a staff member creates the account on the customer's
  behalf) — only the customer self-register flow is built.

Tell me which of these to tackle next — wiring up another table (e.g.
`packages`), more detail pages, or the staff-create-customer flow — and I'll
build on this same shell.

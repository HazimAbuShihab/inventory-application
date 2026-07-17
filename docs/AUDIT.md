# Technical Audit Report — Inventory Management System

Date: 2026-07-16
Scope: full repository + live Supabase project (`inventory-management`, eu-central-1)

Each finding is marked **[FIXED]** (resolved in this repository / applied to the live
database) or **[RECOMMENDATION]** (needs a decision or dashboard access).

---

## 1. Security

### Backend / Supabase

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| S1 | **High** | `users_inv_admin_update` RLS policy allowed IT/Facilities admins to UPDATE **any** user row — including super admins — as long as the resulting role was `employee`. A domain admin could demote every super admin (privilege-destruction attack). | [FIXED] policy now only targets rows whose current role is `employee` |
| S2 | **High** | `assets_update` RLS policy let an employee holding an asset update **every column** (name, price, serial, code…), since `WITH CHECK` only constrained `status`. | [FIXED] column-guard trigger rejects non-admin changes to anything but `status` |
| S3 | Medium | `audit_insert` policy allowed any authenticated user to insert **forged audit log entries** (their own or `user_id IS NULL`). Audit triggers are `SECURITY DEFINER` and don't need the policy. | [FIXED] client INSERT policy dropped; only triggers write logs |
| S4 | Medium | `users_update_own` pinned `role_id` but **not `status`** — a suspended user could re-activate their own account. | [FIXED] status is now pinned via SECURITY DEFINER helpers |
| S5 | Medium | Suspended/inactive users could **still sign in** — the frontend never checked `users.status` after auth. | [FIXED] AuthContext signs out non-active profiles with a clear message |
| S6 | Low | `next_employee_number()` was executable by every authenticated user (information disclosure of employee numbering). | [FIXED] now requires admin/HR role |
| S7 | Low | `users_inv_admin_insert` allowed domain admins to insert profiles with role `inventory_admin` (lateral escalation). | [FIXED] restricted to `employee` |
| S8 | Low | Leaked-password protection (HaveIBeenPwned check) disabled in Supabase Auth. | [RECOMMENDATION] enable in Dashboard → Auth → Passwords (not exposed via MCP/API) |
| S9 | Info | `SECURITY DEFINER` RPCs (`admin_create_user`, `admin_update_user`, …) callable by `authenticated`. All verified to have internal role checks — intentional design. | verified, no change |
| S10 | Info | Storage bucket `asset-images` is private, 5 MB limit, image MIME allow-list, admin-only writes. | verified, no change |

### Frontend

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| F1 | **High** | `.env.local` with the live Supabase URL + anon key was inside the uploaded archive. The anon key is publishable by design, but must never live in git history. | [FIXED] excluded from repo (`*.local` in `.gitignore`), `.env.example` has placeholders only |
| F2 | Medium | README published the **shared demo password for every role**, including super admin, and the seed scripts embedded it as a literal. | [FIXED] removed from README, placeholder in seeds; rotate these accounts before real use |
| F3 | Low | No XSS sinks found — no `dangerouslySetInnerHTML`, no `eval`, React escaping everywhere. Session storage uses supabase-js defaults (localStorage), standard for SPAs. | verified, no change |
| F4 | Low | HR role could open the Employees page but RLS hid `users` rows from HR → names/emails rendered blank (silent data gap, also a functional bug). | [FIXED] `users` SELECT policy now includes HR |

## 2. Performance

### Database (live advisors + query review)

| # | Finding | Status |
|---|---------|--------|
| P1 | 7 unindexed foreign keys (`asset_assignments.assigned_by`, `asset_transactions.performed_by`, `departments.location_id`, `distributions.distributed_by`, `maintenance_records.reported_by`, `requests.approved_by`, `requests.asset_category_id`). | [FIXED] covering indexes added |
| P2 | 6 RLS policies re-evaluated `auth.uid()` **per row** (`auth_rls_initplan` warnings on `users`, `employees`, `maintenance_records`, `audit_logs`). | [FIXED] wrapped in `(SELECT auth.uid())` |
| P3 | `FOR ALL` write policies doubled as SELECT policies on 9 tables (`multiple_permissive_policies` warnings) — every SELECT ran both policies. | [FIXED] write policies split into INSERT/UPDATE/DELETE |
| P4 | "Unused index" INFO notices — expected on a 2-day-old database with seed data; the indexes match real query patterns (status filters, FK joins, partial low-stock index). | kept, re-evaluate under production load |

### Frontend

| # | Finding | Status |
|---|---------|--------|
| P5 | `useAssets` put the raw search string into the React Query key while filtering **client-side** → every keystroke re-fetched the whole assets table. | [FIXED] server-side `ilike` search + 300 ms debounce |
| P6 | No route-level code splitting — recharts, qrcode, all 25+ pages shipped in one bundle to the login screen. | [FIXED] `React.lazy` per page + Suspense fallback |
| P7 | Asset list fetched every row with no cap. | [FIXED] pagination (server-side `range()`) |
| P8 | `useLowStockAssets` fetched **all** disposable assets and filtered in JS (column-to-column comparison not expressible in PostgREST). | [FIXED] dedicated `low_stock_assets` RPC using the existing partial index |
| P9 | No error boundary — a render error blanked the whole app. | [FIXED] top-level ErrorBoundary with reload action |
| P10 | Report queries aggregate client-side (fetch all rows, count in JS). Acceptable at current scale (<10k rows); move to SQL views/RPCs if data grows. | [RECOMMENDATION] |

## 3. UI / UX

| # | Finding | Status |
|---|---------|--------|
| U1 | No pagination on any table — Assets/Employees/Audit Logs render unbounded rows. | [FIXED] shared `TablePagination` + paged queries on the biggest lists |
| U2 | Search inputs fire on every keystroke with no debounce or pending indicator. | [FIXED] debounced search |
| U3 | A render crash produced a white screen with no recovery path. | [FIXED] error boundary with friendly message + reload |
| U4 | Vite starter leftovers shipped to production (`App.css`, `react.svg`, `vite.svg`, `hero.png`, unused `Dashboard.tsx` re-export). | [FIXED] removed |
| U5 | Login/auth pages load the full app bundle before first paint. | [FIXED] code splitting (P6) |
| U6 | Strong foundations verified: consistent shadcn-style component library, empty states with actions, loading states, toast feedback, focus-visible rings, aria-labels on icon buttons, 44px touch targets, mobile drawer nav. | verified, kept |
| U7 | Suspended-account UX: silent failure before; now an explicit "account suspended" toast on sign-in. | [FIXED] |

## 4. Architecture / Code Quality

| # | Finding | Status |
|---|---------|--------|
| A1 | Clean layering (pages → hooks → supabase client; UI kit isolated). Typed DB access via generated `Database` types. | verified, kept |
| A2 | Migration folder contained a placeholder file + `_extracted/` copies instead of real migration files matching the remote history. | [FIXED] migrations restructured to mirror the live project, new fixes added as proper migrations |
| A3 | No tests, no CI. | [FIXED] Vitest unit tests (utils, hooks logic) + GitHub Actions workflow (lint, typecheck, test, build) |
| A4 | No deployment/env documentation. | [FIXED] README rewrite + `docs/DEPLOYMENT.md` |
| A5 | Duplicated date helpers (`todayIso`/`addDaysIso` in two hooks). | [FIXED] extracted to `lib/utils` |

## 5. Security verification (empirical penetration tests)

Each fix was verified against the **live database** by simulating the attacker's
role (via `SET ROLE authenticated` + a forged `request.jwt.claims`) and attempting
the exploit. All write attempts were wrapped in always-rollback blocks so no data
was mutated. Results:

| Attack attempted | Result |
|------------------|--------|
| `facilities_admin` demotes `super_admin` to employee (S1) | **BLOCKED** — 0 rows |
| `inventory_admin` self-escalates to `super_admin` | **BLOCKED** — RLS policy violation |
| `employee` promotes own role to `inventory_admin` | **BLOCKED** — RLS policy violation |
| `employee` re-activates / changes own `status` (S4) | **BLOCKED** — RLS policy violation |
| `employee` edits price/name on assigned asset (S2) | **BLOCKED** — column-guard trigger |
| `employee` changes *status* on assigned asset (legit) | **ALLOWED** — 1 row (no regression) |
| `employee` forges an audit-log row (S3) | **BLOCKED** — RLS policy violation |
| `facilities_admin` writes an IT-domain asset (domain isolation) | **BLOCKED** — RLS policy violation |
| `employee` reads `users` / `assets` / `audit_logs` / `distributions` | **1 / 1 / 0 / 0** (own data only) |
| `anon` (unauthenticated) reads any table | **0 rows** everywhere |

Schema-wide checks: every `public` table has RLS **enabled** with at least one policy,
and **no** `SECURITY DEFINER` function is executable by the `anon` role.

> Note: an earlier iteration of the test harness accidentally committed a few writes
> as the RLS-bypassing service role (a harness bug, not an app vulnerability). Those
> mutations were detected and fully reverted; the database was confirmed pristine
> afterward (correct seed roles/statuses restored, no forged or tampered rows remain).

## 6. Remaining recommendations

1. **Enable leaked-password protection** (and optionally MFA) in the Supabase dashboard —
   Authentication → Passwords. This is the only outstanding security-advisor item and
   cannot be toggled via API/MCP (S8).
2. The 7 `SECURITY DEFINER` functions flagged by the advisor were each reviewed: the
   `admin_*`, `activate/deactivate_employee`, and `next_employee_number` functions
   enforce a role check on their first lines; `current_user_role` and
   `get_dashboard_stats` intentionally scope their output to the caller. All are safe
   as-is — the advisor is a "please review" heuristic, not a confirmed finding.
3. Rotate the demo account passwords before inviting real users (F2).
4. Move report aggregation into SQL views once data volume grows (P10).
5. Add Sentry (or similar) error monitoring for production.
6. Consider `@tanstack/react-virtual` for tables if page sizes above ~100 rows are ever needed.

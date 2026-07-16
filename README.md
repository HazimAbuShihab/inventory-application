# Inventory Management System

Internal inventory system aligned with legacy business rules from the .NET/Angular
inventory application, rebuilt on Supabase + React.

**Stack:** React 19 + TypeScript + Vite · Tailwind CSS 4 · TanStack Query · Supabase (Auth, Postgres, RLS, Storage)

## Features

- Role-based access with IT / Facilities domain isolation, enforced by Postgres RLS
- Locations (building / floor / room)
- Categories + subcategories with IT/Facilities domain
- Permanent asset lifecycle (assign / return / overdue / warranty)
- Disposable distributions (employee XOR department) with reverse
- Employee activate/deactivate guards
- Role-aware dashboards and legacy-aligned reports
- Requests, maintenance, QR codes, audit logs

## Getting started

```bash
npm install
cp .env.example .env.local
# set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project
npm run dev
```

The database schema lives in [`supabase/migrations`](supabase/migrations) and can be
applied to a fresh Supabase project with `supabase db push` (or via the Supabase MCP
`apply_migration` tool). Optional demo data is in [`supabase/seed`](supabase/seed).

## Environment variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL (Dashboard → Project Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/publishable key. Safe to expose in the client bundle; all authorization is enforced by RLS. Never commit the `service_role` key. |

`.env.local` is gitignored — never commit real values.

## Roles

| Role | Access |
|------|--------|
| `super_admin` | Full access, user management, audit logs |
| `it_admin` | IT-domain assets, assignments, categories |
| `facilities_admin` | Facilities-domain assets, locations |
| `inventory_admin` | Both domains (legacy compatibility role) |
| `hr` | Employees, departments, coverage reports |
| `employee` | Own assets, requests, limited reports |

See [docs/legacy-business-rules.md](docs/legacy-business-rules.md) for the reference
business rules and [docs/AUDIT.md](docs/AUDIT.md) for the security/performance audit.

## Scripts

```bash
npm run dev        # start dev server
npm run build      # typecheck + production build
npm run preview    # preview the production build
npm run lint       # oxlint
npm run typecheck  # tsc -b
npm test           # vitest
```

## Project structure

```
src/
  components/     # UI kit (ui/), shared building blocks (common/), layout
  contexts/       # AuthContext (session + profile + role helpers)
  hooks/          # one data hook per domain entity (TanStack Query + supabase-js)
  lib/            # supabase client, shared utils
  pages/          # route components
  routes/         # ProtectedRoute (auth + role guard)
  types/          # generated Database types + app-level types
supabase/
  migrations/     # schema, RLS policies, triggers, RPCs (mirrors remote history)
  seed/           # optional demo data
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). CI (lint, typecheck, tests, build) runs
via GitHub Actions on every push and pull request.

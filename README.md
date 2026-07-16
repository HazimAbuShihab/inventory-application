# Inventory Management System

Production-ready internal inventory system aligned with legacy business rules from the .NET/Angular inventory application, rebuilt on Supabase + React.

**Stack:** React + TypeScript + Vite · Tailwind CSS · TanStack Query · Supabase (Auth, Postgres, RLS, Storage)

## Features

- Role-based access with IT / Facilities domain isolation
- Locations (building / floor / room)
- Categories + subcategories with IT/Facilities domain
- Permanent asset lifecycle (assign / return / overdue / warranty)
- Disposable distributions (employee XOR department) with reverse
- Employee activate/deactivate guards
- Role-aware dashboards and legacy-aligned reports
- Requests, maintenance, QR codes, audit logs (improvements over legacy)

## Getting started

```bash
npm install
cp .env.example .env.local
# set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

## Demo accounts

Password for all: set when seeding (see `supabase/migrations`)

| Email | Role |
|-------|------|
| admin@company.com | Super Admin |
| inventory@company.com | IT Admin |
| facilities@company.com | Facilities Admin |
| hr@company.com | HR |
| employee@company.com | Employee |
| jane@company.com | Employee |

## Roles

| Role | Access |
|------|--------|
| `super_admin` | Full access |
| `it_admin` | IT-domain assets, assignments, categories |
| `facilities_admin` | Facilities-domain assets, locations |
| `hr` | Employees, coverage reports |
| `employee` | Own assets, requests, limited reports |

See [docs/legacy-business-rules.md](docs/legacy-business-rules.md) for the reference business rules.

## Build

```bash
npm run build
npm run preview
```

# Legacy Inventory Business Rules

Reference summary from `D:\Dot-Net-Repos\inventory-application` (ASP.NET Core 8 + Angular 18).  
Used as business-rules source only — not for code migration.

## Domains

1. **Fixed assets** — durable IT/Facilities equipment (barcode, serial, warranty, depreciation, condition).
2. **Assignments** — checkout/return; one active assignment per asset (DB-enforced).
3. **Locations** — building / floor / room; unique composite.
4. **Categories / Subcategories** — taxonomy with domain `IT` or `Facilities`.
5. **Employees / Departments** — org structure; employee soft-deactivate.
6. **Disposable stock + distributions** — consumables; issue to employee XOR department; reverse restores stock.
7. **Reports / role dashboards** — IT, Facilities, HR, Admin.
8. **Audit logs** — entity change trail.

## Roles (target for Supabase rebuild)

| Role | Capability |
|------|------------|
| `super_admin` | Full access, audit, user management |
| `it_admin` | CRUD + assign assets in IT categories |
| `facilities_admin` | CRUD + assign assets in Facilities categories; locations |
| `hr` | Employees activate/deactivate; coverage reports |
| `employee` | Own assigned assets, requests, limited read |

Critical rule: **IT and Facilities isolation by category domain.**

## Fixed-asset lifecycle

1. Create (`available`, condition scale).
2. Assign → `assigned`; one active assignment only.
3. Optional: update assignment location / expected return.
4. Return → `available`.
5. Status paths: `under_maintenance`, `retired`, `lost`, `damaged`.
6. Hard-delete blocked if active assignment.

## Disposable rules

1. Create stock with quantity + low-stock threshold.
2. Distribute to employee **or** department (XOR).
3. Decrement quantity; reverse distribution restores quantity.
4. Cannot reduce total below already distributed amount.

## Validation highlights

- Assign only when status is `available`.
- Deactivate employee blocked while active assignments exist.
- Deactivate location blocked while linked active assignments.
- Location unique `(building, floor, room)`.
- Warranty alerts 30/60/90 days.
- Overdue = expected return passed and not returned.
- Soft-deactivate for employees, locations, categories.

## Not in legacy (kept as improvements)

- Employee asset request/approval workflow.
- Structured maintenance records.
- SAML SSO, Redis, K8s (out of scope for v1).

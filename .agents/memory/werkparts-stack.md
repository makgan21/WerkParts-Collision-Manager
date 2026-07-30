---
name: WerkParts stack & gotchas
description: Key constraints and decisions for the WerkParts collision fastener manager app
---

## Stack
- pnpm monorepo, React+Vite (`artifacts/werkparts`), Express 5 API (`artifacts/api-server`), PostgreSQL + Drizzle ORM
- Orval 8.x codegen from `lib/api-spec/openapi.yaml` → `lib/api-client-react` and `lib/api-zod`
- After any openapi.yaml change: run `pnpm --filter @workspace/api-spec run codegen` then `pnpm --filter @workspace/db run push`

## Critical: Orval + Zod v3
All `type: integer` fields in openapi.yaml MUST use `type: number`. Orval 8.x generates `zod.int()` (Zod v4 API) but the workspace uses Zod v3, which breaks compilation.

**Why:** Discovered during initial build; affects every schema field that's a numeric ID or count.

**How to apply:** Any time you add a new schema field that would be an integer, use `type: number` in the YAML.

## Dialog positioning bug (fixed)
The shadcn Dialog component had `translate-y-[50%]` (wrong direction — pushed dialog below center).
Fixed to `top-[5%]` with no translate-y, plus `max-h-[90vh] overflow-y-auto` for tall forms.

## Theme system
- `artifacts/werkparts/src/lib/theme.tsx` — ThemeProvider context, stores in localStorage key `werkparts-theme`
- Default: dark theme
- Applied via `document.documentElement.classList.toggle("dark", ...)`
- Settings page (`/settings`) has light/dark toggle cards

## App structure decisions
- `/` redirects to `/invoices/new` (main workflow is invoicing)
- Dashboard accessible at `/dashboard`
- Settings (gear icon) at bottom of sidebar — contains Technicians, Insurance Companies, Suppliers, Appearance
- Suppliers moved from main nav into Settings
- Invoice statuses: draft | finalized | voided (NOT "paid")

## Parts catalog
- `quantityInStock` kept in DB but hidden from UI (user doesn't count inventory)
- Added `msrpPrice` and `ourCost` fields (nullable numeric)
- CSV import: client-side parse, POST each row; headers: Part Number, Description, Category, Unit Price, MSRP Price, Our Cost

## Technicians / Insurance Companies
- Tables: `technicians`, `insurance_companies` in DB
- Routes in `artifacts/api-server/src/routes/settings.ts`
- New invoice form: shows dropdowns when data exists, falls back to text input with Settings hint

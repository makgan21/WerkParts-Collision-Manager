# WerkParts - Collision Fastener Manager

A web app for collision repair shops to invoice fasteners (clips, retainers, nuts, bolts) from on-hand stock and bill customers or insurance companies.

## Run & Operate

- `pnpm --filter @workspace/werkparts run dev` — run the frontend (port assigned by artifact)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifacts/werkparts)
- API: Express 5 (artifacts/api-server)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (v3), drizzle-zod
- API codegen: Orval (from OpenAPI spec in lib/api-spec/openapi.yaml)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table definitions (suppliers, parts, invoices, invoiceItems)
- `artifacts/api-server/src/routes/` — Express route handlers (parts, suppliers, invoices, dashboard)
- `artifacts/werkparts/src/` — React frontend (pages, components)
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit by hand)
- `lib/api-zod/src/generated/` — generated Zod validation schemas (do not edit by hand)

## Architecture decisions

- All `type: integer` fields in openapi.yaml must use `type: number` — Orval 8.x generates `zod.int()` (Zod v4 syntax) for integers, but the workspace uses Zod v3. Using `type: number` generates the correct `zod.number()`.
- Invoice numbers are auto-generated server-side in format `WP-YYMM-NNNN`
- Invoice items cascade-delete when an invoice is deleted
- Creating an invoice decrements parts stock quantities automatically
- All money values are stored/returned as decimal strings (not floats) to avoid floating-point errors

## Product

- **Dashboard** — recent invoices, revenue stats, parts-by-category breakdown
- **Invoices** — create, view, edit, delete invoices; each invoice has RO number, date, tech, vehicle info, insurance company, and line items with part number, qty, unit price, total; prints cleanly with "OEM Authorized Price" label
- **Parts Catalog** — manage on-hand fastener inventory (clips, retainers, nuts, bolts) with part numbers, pricing, and stock quantities
- **Suppliers** — manage fastener supplier contact information

## User preferences

- Single shop / personal use
- Invoice must display "OEM Authorized Price" below the parts list
- Invoice fields: RO number, invoice number, date, tech, year/make/model, insurance company
- Line item fields: part number, quantity, price, description, total price
- Track sales of clips, retainers, nuts and bolts

## Gotchas

- After changing openapi.yaml, always run `pnpm --filter @workspace/api-spec run codegen` before touching any frontend or backend code
- Do NOT use `type: integer` in openapi.yaml — use `type: number` (see Architecture decisions)
- Run `pnpm --filter @workspace/db run push` after any schema change in `lib/db/src/schema/`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

# Hardware Pit - Collision Fastener Manager

Hardware Pit is a fastener-invoicing and parts-management app for collision repair shops.

## Run & Operate

- `pnpm --filter @workspace/werkparts run dev` — run the frontend (port assigned by artifact)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/werkparts run desktop:portable:win` — build the portable Windows app
- `pnpm --filter @workspace/werkparts run desktop:installer:win` — build a Windows installer (requires Wine when run on Linux)
- Optional env: `WERKPARTS_DB_PATH` — override the local SQLite file path

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifacts/werkparts)
- API: Express 5 (artifacts/api-server)
- DB: SQLite via Node's built-in `node:sqlite` + Drizzle ORM
- Desktop: Electron for Windows, with a portable executable and NSIS installer configuration
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
- Invoice numbers are auto-generated server-side per RO in format `WP-{RO}-{sequence}` (for example, `WP-5780-1`)
- Invoice items cascade-delete when an invoice is deleted
- Creating an invoice decrements parts stock quantities automatically
- All money values are stored/returned as decimal strings (not floats) to avoid floating-point errors
- Each shop uses a private SQLite database. The portable Windows build stores its data beside the app on the flash drive; an installed build stores data in that Windows user's application data folder.
- Shared app packages include only the parts/vendor catalog. Shop invoices, technicians, insurers, and logos stay in each shop's private database.
- Shops maintain their own parts catalog as vendors add products. Invoice retention/age limits are deferred; do not delete older invoices automatically.

## Product

- **Dashboard** — recent invoices, revenue stats, parts-by-category breakdown
- **Invoices** — create, view, edit, delete invoices; each invoice has RO number, date, tech, vehicle info, insurance company, and line items with part number, qty, unit price, total; prints cleanly with "OEM Authorized Price" label
- **Parts Catalog** — manage on-hand fastener inventory (clips, retainers, nuts, bolts) with part numbers, pricing, and stock quantities
- **Suppliers** — manage fastener supplier contact information
- **Reports** — technician usage, monthly and yearly gross profit, insurance usage, and most-used clips, with printable detail views
- **Invoice Logo** — set, replace, or remove a logo for the local shop's printed invoices

## User preferences

- One shop per private database; only one computer uses that database at a time
- The app is intended to be easy to share, but invoice and shop-specific data must remain private to each shop
- Each shop updates its own parts catalog when vendors add products
- Invoice retention limits may be added later; never purge old invoices without an explicit decision
- Invoice must display "OEM Authorized Price" below the parts list
- Invoice fields: RO number, invoice number, date, tech, year/make/model, insurance company
- Line item fields: part number, quantity, price, description, total price
- Track sales of clips, retainers, nuts and bolts

## Gotchas

- After changing openapi.yaml, always run `pnpm --filter @workspace/api-spec run codegen` before touching any frontend or backend code
- Do NOT use `type: integer` in openapi.yaml — use `type: number` (see Architecture decisions)
- Keep the SQLite DDL in `lib/db/src/index.ts` synchronized with `lib/db/src/schema/` when changing the schema

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

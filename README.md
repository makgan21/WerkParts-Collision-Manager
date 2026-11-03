# Hardware Pit

**Fastener and invoice management for collision repair shops.**

Hardware Pit is a desktop application designed to help collision repair shops manage fastener parts, maintain a parts catalog, and generate invoices and reports.

The application is built with Electron and React, with a local SQLite database for storing application data.

## Features

- **Fastener catalog management** — Maintain a catalog of fastener parts.
- **Parts lookup** — Find and manage parts used by the shop.
- **Invoice generation** — Generate invoices for parts and shop transactions.
- **Reports** — Generate and review reports.
- **Settings** — Configure application settings.
- **Spreadsheet support** — Supports XLSX spreadsheet functionality.
- **Local database** — Uses SQLite for local data storage.
- **Portable Windows build** — Can be packaged as a portable Windows application.

## Technology

- Electron
- React
- TypeScript
- Vite
- SQLite
- XLSX

## Windows Builds

The project supports two Windows distribution formats.

### Portable application

```bash
pnpm run desktop:portable:win
```

### Windows installer

```bash
pnpm run desktop:installer:win
```

Build output is generated in the application's `release` directory.

## Development

Install dependencies using pnpm:

```bash
pnpm install
```

Run the development application:

```bash
pnpm --filter @workspace/werkparts run dev
```

Build the project:

```bash
pnpm run build
```

## Database

Hardware Pit uses a local SQLite database.

The application includes catalog seed data in the current development build. Future public distribution plans may change how catalog data is supplied.

## Project Status

Hardware Pit is under active development.

**Current milestone:** v1.0.0 — Portable desktop application.

## License

MIT

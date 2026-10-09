import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

const schemaSql = `
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
  );

  CREATE TABLE IF NOT EXISTS parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_number TEXT NOT NULL,
    description TEXT NOT NULL,
    pack_quantity INTEGER,
    pack_price TEXT,
    price_each TEXT,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL UNIQUE,
    ro_number TEXT NOT NULL,
    date TEXT NOT NULL,
    tech_name TEXT NOT NULL,
    vehicle_year TEXT NOT NULL,
    vehicle_make TEXT NOT NULL,
    vehicle_model TEXT NOT NULL,
    insurance_company TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    total_amount TEXT NOT NULL DEFAULT '0',
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    part_id INTEGER REFERENCES parts(id) ON DELETE SET NULL,
    part_number TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price TEXT NOT NULL,
    total_price TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
  );

  CREATE TABLE IF NOT EXISTS technicians (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
  );

  CREATE TABLE IF NOT EXISTS insurance_companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
  );

  CREATE TABLE IF NOT EXISTS cross_references (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    reference_type TEXT NOT NULL,
    reference_number TEXT NOT NULL,
    reference_description TEXT,
    reference_price TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
  );

  CREATE TABLE IF NOT EXISTS shop_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    logo_data_url TEXT
  );
`;

export function createDatabase(databasePath: string) {
  if (databasePath !== ":memory:") {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const client = new DatabaseSync(databasePath);
  client.exec(schemaSql);

  const db = drizzle(
    async (query, params, method) => {
      const statement = client.prepare(query);
      const boundParams = params as SQLInputValue[];

      if (method === "run") {
        statement.run(...boundParams);
        return { rows: [] };
      }

      const result = method === "get"
        ? [statement.get(...boundParams)].filter((row) => row !== undefined)
        : statement.all(...boundParams);

      return {
        rows: result.map((row) => Object.values(row as Record<string, unknown>)),
      };
    },
    { schema },
  );

  return { db, client };
}

export const databasePath = process.env.WERKPARTS_DB_PATH
  ? resolve(process.env.WERKPARTS_DB_PATH)
  : resolve(process.cwd(), ".data", "werkparts.sqlite");
const database = createDatabase(databasePath);
export const db = database.db;
export const closeDatabase = () => database.client.close();

export * from "./schema";

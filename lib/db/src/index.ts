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
    unit_cost TEXT,
    unit_cost_is_estimated INTEGER NOT NULL DEFAULT 0,
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

  const invoiceItemColumns = client
    .prepare("PRAGMA table_info(invoice_items)")
    .all() as Array<{ name: string }>;
  if (!invoiceItemColumns.some((column) => column.name === "unit_cost")) {
    client.exec("ALTER TABLE invoice_items ADD COLUMN unit_cost TEXT");
  }
  if (
    !invoiceItemColumns.some(
      (column) => column.name === "unit_cost_is_estimated",
    )
  ) {
    client.exec(
      "ALTER TABLE invoice_items ADD COLUMN unit_cost_is_estimated INTEGER NOT NULL DEFAULT 0",
    );
  }

  const uncostedItems = client
    .prepare(
      `SELECT id, part_id, part_number, unit_price
       FROM invoice_items
       WHERE unit_cost IS NULL`,
    )
    .all() as Array<{
    id: number;
    part_id: number | null;
    part_number: string;
    unit_price: string;
  }>;

  if (uncostedItems.length > 0) {
    const parts = client
      .prepare("SELECT id, part_number, price_each FROM parts ORDER BY id")
      .all() as Array<{
      id: number;
      part_number: string;
      price_each: string | null;
    }>;
    const crossReferences = client
      .prepare(
        `SELECT reference_number, part_id
         FROM cross_references
         ORDER BY id`,
      )
      .all() as Array<{ reference_number: string; part_id: number }>;
    const partsById = new Map(parts.map((part) => [part.id, part]));
    const partsByNumber = new Map<string, (typeof parts)[number]>();
    for (const part of parts) {
      const key = part.part_number.trim().toLowerCase();
      if (key && !partsByNumber.has(key)) partsByNumber.set(key, part);
    }
    const partIdByCrossReference = new Map<string, number>();
    for (const reference of crossReferences) {
      const key = reference.reference_number.trim().toLowerCase();
      if (key && !partIdByCrossReference.has(key)) {
        partIdByCrossReference.set(key, reference.part_id);
      }
    }
    const getValidCost = (part?: (typeof parts)[number]) => {
      const value = part?.price_each;
      if (value == null || value.trim() === "") return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 ? value : null;
    };
    const updateCost = client.prepare(
      `UPDATE invoice_items
       SET unit_cost = ?, unit_cost_is_estimated = ?
       WHERE id = ?`,
    );

    client.exec("BEGIN IMMEDIATE");
    try {
      for (const item of uncostedItems) {
        const key = item.part_number.trim().toLowerCase();
        const directPart =
          (item.part_id == null ? undefined : partsById.get(item.part_id)) ??
          partsByNumber.get(key);
        let unitCost = getValidCost(directPart);
        if (unitCost == null) {
          const crossReferencePartId = partIdByCrossReference.get(key);
          unitCost = getValidCost(
            crossReferencePartId == null
              ? undefined
              : partsById.get(crossReferencePartId),
          );
        }

        const estimated = unitCost == null;
        if (estimated) {
          const salePrice = Number(item.unit_price);
          if (!Number.isFinite(salePrice) || salePrice < 0) {
            throw new Error(
              `Cannot estimate cost for invoice item ${item.id}: invalid unit price.`,
            );
          }
          unitCost = (salePrice * 0.6).toFixed(4);
        }
        updateCost.run(unitCost, estimated ? 1 : 0, item.id);
      }
      client.exec("COMMIT");
    } catch (error) {
      client.exec("ROLLBACK");
      throw error;
    }
  }

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
  : resolve(process.cwd(), ".data", "werkparts-private.sqlite");
const database = createDatabase(databasePath);
export const db = database.db;
export const sqliteClient = database.client;
export const closeDatabase = () => database.client.close();

export * from "./schema";

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { suppliersTable } from "./suppliers";

export const partsTable = sqliteTable("parts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  partNumber: text("part_number").notNull(),
  description: text("description").notNull(),

  packQuantity: integer("pack_quantity"),
  packPrice: text("pack_price"),
  priceEach: text("price_each"),

  supplierId: integer("supplier_id").references(() => suppliersTable.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(strftime('%s', 'now') AS INTEGER) * 1000)`),
});

export const insertPartSchema = createInsertSchema(partsTable).omit({ id: true, createdAt: true });
export type InsertPart = z.infer<typeof insertPartSchema>;
export type Part = typeof partsTable.$inferSelect;
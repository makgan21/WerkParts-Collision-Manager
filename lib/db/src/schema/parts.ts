import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { suppliersTable } from "./suppliers";

export const partsTable = pgTable("parts", {
  id: serial("id").primaryKey(),
  partNumber: text("part_number").notNull(),
  description: text("description").notNull(),

  packQuantity: integer("pack_quantity"),
  packPrice: numeric("pack_price", { precision: 10, scale: 2 }),
  priceEach: numeric("price_each", { precision: 10, scale: 4 }),

  supplierId: integer("supplier_id").references(() => suppliersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPartSchema = createInsertSchema(partsTable).omit({ id: true, createdAt: true });
export type InsertPart = z.infer<typeof insertPartSchema>;
export type Part = typeof partsTable.$inferSelect;
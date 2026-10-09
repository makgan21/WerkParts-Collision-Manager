import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { partsTable } from "./parts";

export const crossReferencesTable = sqliteTable("cross_references", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  partId: integer("part_id")
    .references(() => partsTable.id, { onDelete: "cascade" })
    .notNull(),

  referenceType: text("reference_type").notNull(),

  referenceNumber: text("reference_number").notNull(),

  referenceDescription: text("reference_description"),

  referencePrice: text("reference_price"),

  notes: text("notes"),

  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(strftime('%s', 'now') AS INTEGER) * 1000)`),
});

export const insertCrossReferenceSchema =
  createInsertSchema(crossReferencesTable).omit({
    id: true,
    createdAt: true,
  });

export type InsertCrossReference =
  z.infer<typeof insertCrossReferenceSchema>;

export type CrossReference =
  typeof crossReferencesTable.$inferSelect;
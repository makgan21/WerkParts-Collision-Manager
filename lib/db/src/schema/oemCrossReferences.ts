import { pgTable, text, serial, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { partsTable } from "./parts";

export const oemCrossReferencesTable = pgTable("oem_cross_references", {
  id: serial("id").primaryKey(),

  partId: integer("part_id")
    .references(() => partsTable.id, { onDelete: "cascade" })
    .notNull(),

  manufacturer: text("manufacturer").notNull(),

  oemPartNumber: text("oem_part_number").notNull(),

  oemDescription: text("oem_description"),

  oemPrice: numeric("oem_price", {
    precision: 10,
    scale: 2,
  }),

  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertOemCrossReferenceSchema =
  createInsertSchema(oemCrossReferencesTable).omit({
    id: true,
    createdAt: true,
  });

export type InsertOemCrossReference =
  z.infer<typeof insertOemCrossReferenceSchema>;

export type OemCrossReference =
  typeof oemCrossReferencesTable.$inferSelect;

import { pgTable, text, serial, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { partsTable } from "./parts";

export const crossReferencesTable = pgTable("cross_references", {
  id: serial("id").primaryKey(),

  partId: integer("part_id")
    .references(() => partsTable.id, { onDelete: "cascade" })
    .notNull(),

  referenceType: text("reference_type").notNull(),

  referenceNumber: text("reference_number").notNull(),

  referenceDescription: text("reference_description"),

  referencePrice: numeric("reference_price", {
    precision: 10,
    scale: 2,
  }),

  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
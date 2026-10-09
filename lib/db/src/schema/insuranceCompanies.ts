import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const insuranceCompaniesTable = sqliteTable("insurance_companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CAST(strftime('%s', 'now') AS INTEGER) * 1000)`),
});

export const insertInsuranceCompanySchema = createInsertSchema(insuranceCompaniesTable).omit({ id: true, createdAt: true });
export type InsertInsuranceCompany = z.infer<typeof insertInsuranceCompanySchema>;
export type InsuranceCompany = typeof insuranceCompaniesTable.$inferSelect;

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shopProfileTable = sqliteTable("shop_profile", {
  id: integer("id").primaryKey(),
  logoDataUrl: text("logo_data_url"),
});

export const insertShopProfileSchema = createInsertSchema(shopProfileTable);
export type InsertShopProfile = z.infer<typeof insertShopProfileSchema>;
export type ShopProfile = typeof shopProfileTable.$inferSelect;

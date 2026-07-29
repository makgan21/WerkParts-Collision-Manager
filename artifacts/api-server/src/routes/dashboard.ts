import { Router, type IRouter } from "express";
import { desc, gte, sql } from "drizzle-orm";
import { db, invoicesTable, invoiceItemsTable, partsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard", async (_req, res): Promise<void> => {
  // Total invoices and revenue
  const allInvoices = await db
    .select()
    .from(invoicesTable)
    .orderBy(desc(invoicesTable.createdAt));

  const totalRevenue = allInvoices.reduce(
    (sum, inv) => sum + Number(inv.totalAmount ?? 0),
    0,
  );

  // This month stats
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const thisMonthInvoices = allInvoices.filter((inv) => inv.date >= firstOfMonth);

  const revenueThisMonth = thisMonthInvoices.reduce(
    (sum, inv) => sum + Number(inv.totalAmount ?? 0),
    0,
  );

  // Recent invoices (last 5)
  const recentInvoices = allInvoices.slice(0, 5);

  // Get item counts for recent invoices
  const allItems = await db.select().from(invoiceItemsTable);
  const countByInvoice = allItems.reduce((acc: Record<number, number>, item) => {
    acc[item.invoiceId] = (acc[item.invoiceId] ?? 0) + 1;
    return acc;
  }, {});

  const formattedRecent = recentInvoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    roNumber: inv.roNumber,
    date: inv.date,
    techName: inv.techName,
    vehicleYear: inv.vehicleYear,
    vehicleMake: inv.vehicleMake,
    vehicleModel: inv.vehicleModel,
    insuranceCompany: inv.insuranceCompany,
    status: inv.status,
    totalAmount: inv.totalAmount?.toString() ?? "0",
    itemCount: countByInvoice[inv.id] ?? 0,
    createdAt: inv.createdAt.toISOString(),
  }));

  // Parts by category
  const parts = await db.select().from(partsTable);
  const categoryMap: Record<string, number> = {};
  for (const part of parts) {
    categoryMap[part.category] = (categoryMap[part.category] ?? 0) + 1;
  }
  const partsByCategory = Object.entries(categoryMap).map(([category, count]) => ({
    category,
    count,
  }));

  res.json({
    totalInvoices: allInvoices.length,
    totalRevenue: totalRevenue.toFixed(2),
    invoicesThisMonth: thisMonthInvoices.length,
    revenueThisMonth: revenueThisMonth.toFixed(2),
    recentInvoices: formattedRecent,
    partsByCategory,
  });
});

export default router;

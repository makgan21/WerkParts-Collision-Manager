import { Router, type IRouter } from "express";
import { db, invoiceItemsTable, invoicesTable, partsTable } from "@workspace/db";

const router: IRouter = Router();
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type UsageAccumulator = {
  invoiceCount: number;
  totalRevenue: number;
};

function addUsage(
  map: Map<string, UsageAccumulator>,
  key: string,
  revenue: number,
) {
  const existing = map.get(key) ?? { invoiceCount: 0, totalRevenue: 0 };
  map.set(key, {
    invoiceCount: existing.invoiceCount + 1,
    totalRevenue: existing.totalRevenue + revenue,
  });
}

function formatUsage(map: Map<string, UsageAccumulator>) {
  return Array.from(map.entries())
    .map(([name, data]) => ({
      name,
      invoiceCount: data.invoiceCount,
      totalRevenue: data.totalRevenue.toFixed(2),
    }))
    .sort((a, b) => Number(b.totalRevenue) - Number(a.totalRevenue));
}

router.get("/reports", async (_req, res): Promise<void> => {
  const [invoices, invoiceItems, parts] = await Promise.all([
    db.select().from(invoicesTable),
    db.select().from(invoiceItemsTable),
    db
      .select({
        id: partsTable.id,
        partNumber: partsTable.partNumber,
        description: partsTable.description,
      })
      .from(partsTable),
  ]);

  const partsById = new Map(parts.map((part) => [part.id, part]));
  const technicianUsage = new Map<string, UsageAccumulator>();
  const insuranceUsage = new Map<string, UsageAccumulator>();
  const monthlyRevenue = new Map<string, UsageAccumulator>();
  const yearlyRevenue = new Map<string, UsageAccumulator>();

  for (const invoice of invoices) {
    const revenue = Number(invoice.totalAmount ?? 0);
    const technician = invoice.techName || "Unknown";
    const insuranceCompany = invoice.insuranceCompany || "Unknown";

    addUsage(technicianUsage, technician, revenue);
    addUsage(insuranceUsage, insuranceCompany, revenue);

    const [year, month] = invoice.date.split("-");
    if (year) addUsage(yearlyRevenue, year, revenue);
    if (year && month) addUsage(monthlyRevenue, `${year}-${month}`, revenue);
  }

  const formatRevenueRows = (map: Map<string, UsageAccumulator>) =>
    Array.from(map.entries())
      .map(([period, data]) => {
        const [year, month] = period.split("-");
        const label = month
          ? `${monthNames[Number(month) - 1] ?? month} ${year}`
          : period;

        return {
          period,
          label,
          invoiceCount: data.invoiceCount,
          totalRevenue: data.totalRevenue.toFixed(2),
        };
      })
      .sort((a, b) => b.period.localeCompare(a.period));

  const clipUsage = new Map<
    string,
    {
      partNumber: string;
      description: string;
      quantity: number;
      invoiceIds: Set<number>;
      totalRevenue: number;
    }
  >();

  for (const item of invoiceItems) {
    const catalogPart = item.partId == null ? undefined : partsById.get(item.partId);
    const partNumber = catalogPart?.partNumber ?? item.partNumber;
    const description = catalogPart?.description ?? item.description;
    const clipDescription = `${partNumber} ${description}`.toLowerCase();
    const isClipStyleFastener = /\b(clip|retainer|rivet|fastener|pin)\b/.test(clipDescription);
    const isGrommet = /\bgrommet\b/.test(clipDescription) && !/\b(screw|nut|washer)\b/.test(clipDescription);
    if (!isClipStyleFastener && !isGrommet) continue;

    const key = catalogPart
      ? `part:${catalogPart.id}`
      : `value:${partNumber.trim().toLowerCase()}|${description.trim().toLowerCase()}`;
    const existing = clipUsage.get(key) ?? {
      partNumber,
      description,
      quantity: 0,
      invoiceIds: new Set<number>(),
      totalRevenue: 0,
    };

    existing.quantity += Number(item.quantity ?? 0);
    existing.invoiceIds.add(item.invoiceId);
    existing.totalRevenue += Number(item.totalPrice ?? 0);
    clipUsage.set(key, existing);
  }

  res.json({
    totalInvoices: invoices.length,
    totalRevenue: invoices
      .reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0)
      .toFixed(2),
    technicianUsage: formatUsage(technicianUsage),
    monthlyRevenue: formatRevenueRows(monthlyRevenue),
    yearlyRevenue: formatRevenueRows(yearlyRevenue),
    insuranceUsage: formatUsage(insuranceUsage),
    clipUsage: Array.from(clipUsage.values())
      .map((clip) => ({
        partNumber: clip.partNumber,
        description: clip.description,
        quantity: clip.quantity,
        invoiceCount: clip.invoiceIds.size,
        totalRevenue: clip.totalRevenue.toFixed(2),
      }))
      .sort((a, b) => b.quantity - a.quantity || Number(b.totalRevenue) - Number(a.totalRevenue)),
  });
});

export default router;
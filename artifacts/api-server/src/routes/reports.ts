import { Router, type IRouter } from "express";
import {
  db,
  invoiceItemsTable,
  invoicesTable,
  partsTable,
  crossReferencesTable,
} from "@workspace/db";

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
  grossProfit: number;
};

function addUsage(
  map: Map<string, UsageAccumulator>,
  key: string,
  grossProfit: number,
) {
  const existing = map.get(key) ?? { invoiceCount: 0, grossProfit: 0 };
  map.set(key, {
    invoiceCount: existing.invoiceCount + 1,
    grossProfit: existing.grossProfit + grossProfit,
  });
}

function formatUsage(map: Map<string, UsageAccumulator>) {
  return Array.from(map.entries())
    .map(([name, data]) => ({
      name,
      invoiceCount: data.invoiceCount,
      grossProfit: data.grossProfit.toFixed(2),
    }))
    .sort((a, b) => Number(b.grossProfit) - Number(a.grossProfit));
}

function parseCost(value: string | null | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

router.get("/reports", async (_req, res): Promise<void> => {
  const [invoices, invoiceItems, parts, crossReferences] = await Promise.all([
    db.select().from(invoicesTable),
    db.select().from(invoiceItemsTable),
    db
      .select({
        id: partsTable.id,
        partNumber: partsTable.partNumber,
        description: partsTable.description,
        priceEach: partsTable.priceEach,
      })
      .from(partsTable)
      .orderBy(partsTable.id),
    db
      .select({
        partId: crossReferencesTable.partId,
        referenceNumber: crossReferencesTable.referenceNumber,
      })
      .from(crossReferencesTable)
      .orderBy(crossReferencesTable.id),
  ]);

  const partsById = new Map(parts.map((part) => [part.id, part]));
  const partsByNumber = new Map<string, (typeof parts)[number]>();
  for (const part of parts) {
    const key = part.partNumber.trim().toLowerCase();
    if (key && !partsByNumber.has(key)) partsByNumber.set(key, part);
  }
  const partIdByCrossReference = new Map<string, number>();
  for (const reference of crossReferences) {
    const key = reference.referenceNumber.trim().toLowerCase();
    if (key && !partIdByCrossReference.has(key)) {
      partIdByCrossReference.set(key, reference.partId);
    }
  }

  const findCatalogPart = (item: (typeof invoiceItems)[number]) => {
    const byId = item.partId == null ? undefined : partsById.get(item.partId);
    if (byId) return byId;

    const normalizedPartNumber = item.partNumber.trim().toLowerCase();
    const byNumber = partsByNumber.get(normalizedPartNumber);
    if (byNumber) return byNumber;

    const crossReferencePartId =
      partIdByCrossReference.get(normalizedPartNumber);
    return crossReferencePartId == null
      ? undefined
      : partsById.get(crossReferencePartId);
  };

  let estimatedCostItemCount = 0;
  const costByInvoice = new Map<number, number>();
  const resolvedCosts = new Map<
    number,
    { unitCost: number; isEstimated: boolean }
  >();

  for (const item of invoiceItems) {
    const storedCost = parseCost(item.unitCost);
    if (storedCost != null) {
      resolvedCosts.set(item.id, {
        unitCost: storedCost,
        isEstimated: item.unitCostIsEstimated,
      });
    } else {
      const catalogCost = parseCost(findCatalogPart(item)?.priceEach);
      if (catalogCost != null) {
        resolvedCosts.set(item.id, { unitCost: catalogCost, isEstimated: false });
      } else {
        const saleUnitPrice = Number(item.unitPrice);
        if (!Number.isFinite(saleUnitPrice) || saleUnitPrice < 0) {
          throw new Error(
            `Cannot estimate cost for invoice item ${item.id}: invalid unit price.`,
          );
        }
        resolvedCosts.set(item.id, {
          unitCost: saleUnitPrice * 0.6,
          isEstimated: true,
        });
      }
    }

    const itemCost = resolvedCosts.get(item.id)!;
    if (itemCost.isEstimated) estimatedCostItemCount += 1;
    const lineCost = itemCost.unitCost * Number(item.quantity);
    costByInvoice.set(
      item.invoiceId,
      (costByInvoice.get(item.invoiceId) ?? 0) + lineCost,
    );
  }

  const technicianUsage = new Map<string, UsageAccumulator>();
  const insuranceUsage = new Map<string, UsageAccumulator>();
  const monthlyGrossProfit = new Map<string, UsageAccumulator>();
  const yearlyGrossProfit = new Map<string, UsageAccumulator>();
  const grossProfitByInvoice = new Map<number, number>();

  for (const invoice of invoices) {
    const sales = Number(invoice.totalAmount ?? 0);
    if (!Number.isFinite(sales)) {
      throw new Error(`Cannot calculate gross profit for invoice ${invoice.id}.`);
    }
    const grossProfit = sales - (costByInvoice.get(invoice.id) ?? 0);
    grossProfitByInvoice.set(invoice.id, grossProfit);

    addUsage(technicianUsage, invoice.techName || "Unknown", grossProfit);
    addUsage(
      insuranceUsage,
      invoice.insuranceCompany || "Unknown",
      grossProfit,
    );

    const [year, month] = invoice.date.split("-");
    if (year) addUsage(yearlyGrossProfit, year, grossProfit);
    if (year && month) {
      addUsage(monthlyGrossProfit, `${year}-${month}`, grossProfit);
    }
  }

  const formatGrossProfitRows = (map: Map<string, UsageAccumulator>) =>
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
          grossProfit: data.grossProfit.toFixed(2),
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
      grossProfit: number;
    }
  >();

  for (const item of invoiceItems) {
    const catalogPart = findCatalogPart(item);
    const partNumber = catalogPart?.partNumber ?? item.partNumber;
    const description = catalogPart?.description ?? item.description;
    const clipDescription = `${partNumber} ${description}`.toLowerCase();
    const isClipStyleFastener =
      /\b(clip|retainer|rivet|fastener|pin)\b/.test(clipDescription);
    const isGrommet =
      /\bgrommet\b/.test(clipDescription) &&
      !/\b(screw|nut|washer)\b/.test(clipDescription);
    if (!isClipStyleFastener && !isGrommet) continue;

    const key = catalogPart
      ? `part:${catalogPart.id}`
      : `value:${partNumber.trim().toLowerCase()}|${description.trim().toLowerCase()}`;
    const existing = clipUsage.get(key) ?? {
      partNumber,
      description,
      quantity: 0,
      invoiceIds: new Set<number>(),
      grossProfit: 0,
    };

    const itemCost = resolvedCosts.get(item.id)!;
    const sales = Number(item.totalPrice ?? 0);
    const grossProfit = sales - itemCost.unitCost * Number(item.quantity);
    existing.quantity += Number(item.quantity ?? 0);
    existing.invoiceIds.add(item.invoiceId);
    existing.grossProfit += grossProfit;
    clipUsage.set(key, existing);
  }

  res.json({
    totalInvoices: invoices.length,
    totalGrossProfit: Array.from(grossProfitByInvoice.values())
      .reduce((sum, grossProfit) => sum + grossProfit, 0)
      .toFixed(2),
    estimatedCostItemCount,
    technicianUsage: formatUsage(technicianUsage),
    monthlyGrossProfit: formatGrossProfitRows(monthlyGrossProfit),
    yearlyGrossProfit: formatGrossProfitRows(yearlyGrossProfit),
    insuranceUsage: formatUsage(insuranceUsage),
    clipUsage: Array.from(clipUsage.values())
      .map((clip) => ({
        partNumber: clip.partNumber,
        description: clip.description,
        quantity: clip.quantity,
        invoiceCount: clip.invoiceIds.size,
        grossProfit: clip.grossProfit.toFixed(2),
      }))
      .sort(
        (a, b) =>
          b.quantity - a.quantity ||
          Number(b.grossProfit) - Number(a.grossProfit),
      ),
  });
});

export default router;

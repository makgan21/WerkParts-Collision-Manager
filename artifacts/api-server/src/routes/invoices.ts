import { Router, type IRouter } from "express";
import { asc, eq, desc, sql } from "drizzle-orm";
import {
  db,
  invoicesTable,
  invoiceItemsTable,
  partsTable,
  crossReferencesTable,
} from "@workspace/db";
import {
  CreateInvoiceBody,
  UpdateInvoiceBody,
  GetInvoiceParams,
  UpdateInvoiceParams,
  DeleteInvoiceParams,
  ListInvoicesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseUnitCost(value: string | null | undefined): string | null {
  if (value == null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? value : null;
}

async function findCatalogUnitCost(item: {
  partId?: number | null;
  partNumber: string;
}): Promise<string | null> {
  if (item.partId != null) {
    const [part] = await db
      .select({ priceEach: partsTable.priceEach })
      .from(partsTable)
      .where(eq(partsTable.id, item.partId))
      .limit(1);
    const cost = parseUnitCost(part?.priceEach);
    if (cost != null) return cost;
  }

  const normalizedPartNumber = item.partNumber.trim().toLowerCase();
  if (!normalizedPartNumber) return null;

  const [directMatch] = await db
    .select({ priceEach: partsTable.priceEach })
    .from(partsTable)
    .where(sql`lower(trim(${partsTable.partNumber})) = ${normalizedPartNumber}`)
    .orderBy(asc(partsTable.id))
    .limit(1);
  const directCost = parseUnitCost(directMatch?.priceEach);
  if (directCost != null) return directCost;

  const [crossReferenceMatch] = await db
    .select({ priceEach: partsTable.priceEach })
    .from(crossReferencesTable)
    .innerJoin(partsTable, eq(crossReferencesTable.partId, partsTable.id))
    .where(
      sql`lower(trim(${crossReferencesTable.referenceNumber})) = ${normalizedPartNumber}`,
    )
    .orderBy(asc(partsTable.id))
    .limit(1);
  return parseUnitCost(crossReferenceMatch?.priceEach);
}

async function buildInvoiceItemValues(
  items: Array<{
    partId?: number | null;
    partNumber: string;
    description: string;
    quantity: number;
    unitPrice: string;
  }>,
  invoiceId: number,
) {
  return Promise.all(
    items.map(async (item) => {
      const catalogCost = await findCatalogUnitCost(item);
      const unitPrice = Number(item.unitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(`Invalid unit price for part ${item.partNumber}.`);
      }

      return {
        invoiceId,
        partId: item.partId ?? null,
        partNumber: item.partNumber,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: (unitPrice * Number(item.quantity)).toFixed(2),
        unitCost: catalogCost ?? (unitPrice * 0.6).toFixed(4),
        unitCostIsEstimated: catalogCost == null,
      };
    }),
  );
}

function formatInvoiceItem(item: typeof invoiceItemsTable.$inferSelect) {
  return {
    id: item.id,
    invoiceId: item.invoiceId,
    partId: item.partId,
    partNumber: item.partNumber,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice?.toString() ?? "0",
    totalPrice: item.totalPrice?.toString() ?? "0",
    createdAt: item.createdAt.toISOString(),
  };
}

async function generateInvoiceNumber(roNumber: string): Promise<string> {
  const normalizedRoNumber = roNumber.trim();
  const existingInvoices = await db
    .select({ invoiceNumber: invoicesTable.invoiceNumber })
    .from(invoicesTable)
    .where(eq(invoicesTable.roNumber, normalizedRoNumber));

  const escapedRoNumber = normalizedRoNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sequencePattern = new RegExp(`^WP-${escapedRoNumber}-(\\d+)$`, "i");
  const existingSequenceNumbers = existingInvoices.flatMap(({ invoiceNumber }) => {
    const match = invoiceNumber.match(sequencePattern);
    return match ? [Number(match[1])] : [];
  });

  const nextSequence = Math.max(0, ...existingSequenceNumbers) + 1;

  return `WP-${normalizedRoNumber}-${nextSequence}`;
}

function formatInvoice(inv: typeof invoicesTable.$inferSelect, itemCount?: number) {
  return {
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
    itemCount: itemCount ?? 0,
    createdAt: inv.createdAt.toISOString(),
  };
}

router.get("/invoices", async (req, res): Promise<void> => {
  const query = ListInvoicesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let rows = await db
    .select()
    .from(invoicesTable)
    .orderBy(desc(invoicesTable.createdAt));

  if (query.data.search) {
    const s = query.data.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.invoiceNumber.toLowerCase().includes(s) ||
        r.roNumber.toLowerCase().includes(s) ||
        r.vehicleMake.toLowerCase().includes(s) ||
        r.vehicleModel.toLowerCase().includes(s) ||
        r.insuranceCompany.toLowerCase().includes(s) ||
        r.techName.toLowerCase().includes(s),
    );
  }

  if (query.data.status) {
    rows = rows.filter((r) => r.status === query.data.status);
  }

  // Get item counts
  const allItems = await db.select().from(invoiceItemsTable);
  const countByInvoice = allItems.reduce((acc: Record<number, number>, item) => {
    acc[item.invoiceId] = (acc[item.invoiceId] ?? 0) + 1;
    return acc;
  }, {});

  res.json(rows.map((r) => formatInvoice(r, countByInvoice[r.id] ?? 0)));
});

router.post("/invoices", async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { items, ...invoiceData } = parsed.data;
  const normalizedRoNumber = invoiceData.roNumber.trim();

  // Calculate total
  const total = items.reduce((sum, item) => {
    return sum + Number(item.unitPrice) * Number(item.quantity);
  }, 0);

  const [invoice] = await db
    .insert(invoicesTable)
    .values({
      invoiceNumber: await generateInvoiceNumber(normalizedRoNumber),
      roNumber: normalizedRoNumber,
      date: invoiceData.date,
      techName: invoiceData.techName,
      vehicleYear: invoiceData.vehicleYear,
      vehicleMake: invoiceData.vehicleMake,
      vehicleModel: invoiceData.vehicleModel,
      insuranceCompany: invoiceData.insuranceCompany,
      status: invoiceData.status ?? "draft",
      totalAmount: total.toFixed(2),
      notes: invoiceData.notes ?? null,
    })
    .returning();

  // Insert items
  let insertedItems: typeof invoiceItemsTable.$inferSelect[] = [];
  if (items.length > 0) {
    insertedItems = await db
      .insert(invoiceItemsTable)
      .values(await buildInvoiceItemValues(items, invoice.id))
      .returning();
  }

  res.status(201).json({
    ...formatInvoice(invoice, insertedItems.length),
    notes: invoice.notes,
    items: insertedItems.map(formatInvoiceItem),
  });
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, params.data.id));

  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const items = await db
    .select()
    .from(invoiceItemsTable)
    .where(eq(invoiceItemsTable.invoiceId, invoice.id))
    .orderBy(invoiceItemsTable.id);

  res.json({
    ...formatInvoice(invoice, items.length),
    notes: invoice.notes,
    items: items.map(formatInvoiceItem),
  });
});

router.put("/invoices/:id", async (req, res): Promise<void> => {
  const params = UpdateInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [currentInvoice] = await db
    .select({ status: invoicesTable.status })
    .from(invoicesTable)
    .where(eq(invoicesTable.id, params.data.id));

  if (!currentInvoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  if (currentInvoice.status === "finalized") {
    res.status(409).json({ error: "Finalized invoices are locked and cannot be changed" });
    return;
  }

  if (currentInvoice.status === "voided") {
    res.status(409).json({ error: "Voided invoices are locked and cannot be changed" });
    return;
  }

  const { items, ...invoiceFields } = parsed.data;

  const updateData: Record<string, unknown> = {};
  if (invoiceFields.roNumber != null) updateData.roNumber = invoiceFields.roNumber;
  if (invoiceFields.date != null) updateData.date = invoiceFields.date;
  if (invoiceFields.techName != null) updateData.techName = invoiceFields.techName;
  if (invoiceFields.vehicleYear != null) updateData.vehicleYear = invoiceFields.vehicleYear;
  if (invoiceFields.vehicleMake != null) updateData.vehicleMake = invoiceFields.vehicleMake;
  if (invoiceFields.vehicleModel != null) updateData.vehicleModel = invoiceFields.vehicleModel;
  if (invoiceFields.insuranceCompany != null) updateData.insuranceCompany = invoiceFields.insuranceCompany;
  if (invoiceFields.status != null) updateData.status = invoiceFields.status;
  if ("notes" in invoiceFields) updateData.notes = invoiceFields.notes ?? null;

  // Rebuild items if provided
  if (items !== undefined) {
    const total = items.reduce((sum, item) => {
      return sum + Number(item.unitPrice) * Number(item.quantity);
    }, 0);
    updateData.totalAmount = total.toFixed(2);

    // Delete existing items and re-insert
    await db.delete(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, params.data.id));

    if (items.length > 0) {
      await db
        .insert(invoiceItemsTable)
        .values(await buildInvoiceItemValues(items, params.data.id));
    }
  }

  const [invoice] = await db
    .update(invoicesTable)
    .set(updateData)
    .where(eq(invoicesTable.id, params.data.id))
    .returning();

  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const updatedItems = await db
    .select()
    .from(invoiceItemsTable)
    .where(eq(invoiceItemsTable.invoiceId, invoice.id))
    .orderBy(invoiceItemsTable.id);

  res.json({
    ...formatInvoice(invoice, updatedItems.length),
    notes: invoice.notes,
    items: updatedItems.map(formatInvoiceItem),
  });
});

router.delete("/invoices/:id", async (req, res): Promise<void> => {
  const params = DeleteInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [currentInvoice] = await db
    .select({ status: invoicesTable.status })
    .from(invoicesTable)
    .where(eq(invoicesTable.id, params.data.id));

  if (!currentInvoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  if (currentInvoice.status === "finalized" || currentInvoice.status === "voided") {
    res.status(409).json({ error: "Locked invoices cannot be deleted" });
    return;
  }

  const [invoice] = await db
    .delete(invoicesTable)
    .where(eq(invoicesTable.id, params.data.id))
    .returning();

  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

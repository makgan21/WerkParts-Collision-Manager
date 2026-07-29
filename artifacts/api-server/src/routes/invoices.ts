import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, invoicesTable, invoiceItemsTable, partsTable } from "@workspace/db";
import {
  CreateInvoiceBody,
  UpdateInvoiceBody,
  GetInvoiceParams,
  UpdateInvoiceParams,
  DeleteInvoiceParams,
  ListInvoicesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `WP-${year}${month}-${rand}`;
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

  // Calculate total
  const total = items.reduce((sum, item) => {
    return sum + Number(item.unitPrice) * Number(item.quantity);
  }, 0);

  const [invoice] = await db
    .insert(invoicesTable)
    .values({
      invoiceNumber: generateInvoiceNumber(),
      roNumber: invoiceData.roNumber,
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
      .values(
        items.map((item) => ({
          invoiceId: invoice.id,
          partId: item.partId ?? null,
          partNumber: item.partNumber,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: (Number(item.unitPrice) * Number(item.quantity)).toFixed(2),
        })),
      )
      .returning();

    // Decrement stock for parts
    for (const item of items) {
      if (item.partId) {
        const [part] = await db
          .select()
          .from(partsTable)
          .where(eq(partsTable.id, item.partId));
        if (part) {
          await db
            .update(partsTable)
            .set({ quantityInStock: Math.max(0, part.quantityInStock - item.quantity) })
            .where(eq(partsTable.id, item.partId));
        }
      }
    }
  }

  res.status(201).json({
    ...formatInvoice(invoice, insertedItems.length),
    notes: invoice.notes,
    items: insertedItems.map((i) => ({
      ...i,
      unitPrice: i.unitPrice?.toString() ?? "0",
      totalPrice: i.totalPrice?.toString() ?? "0",
      createdAt: i.createdAt.toISOString(),
    })),
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
    items: items.map((i) => ({
      ...i,
      unitPrice: i.unitPrice?.toString() ?? "0",
      totalPrice: i.totalPrice?.toString() ?? "0",
      createdAt: i.createdAt.toISOString(),
    })),
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
      await db.insert(invoiceItemsTable).values(
        items.map((item) => ({
          invoiceId: params.data.id,
          partId: item.partId ?? null,
          partNumber: item.partNumber,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: (Number(item.unitPrice) * Number(item.quantity)).toFixed(2),
        })),
      );
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
    items: updatedItems.map((i) => ({
      ...i,
      unitPrice: i.unitPrice?.toString() ?? "0",
      totalPrice: i.totalPrice?.toString() ?? "0",
      createdAt: i.createdAt.toISOString(),
    })),
  });
});

router.delete("/invoices/:id", async (req, res): Promise<void> => {
  const params = DeleteInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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

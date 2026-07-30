import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, partsTable, suppliersTable } from "@workspace/db";
import {
  CreatePartBody,
  UpdatePartBody,
  GetPartParams,
  UpdatePartParams,
  DeletePartParams,
  ListPartsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatPart(r: typeof partsTable.$inferSelect & { supplierName?: string | null }) {
  return {
    ...r,
    unitPrice: r.unitPrice?.toString() ?? "0",
    msrpPrice: r.msrpPrice?.toString() ?? null,
    ourCost: r.ourCost?.toString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/parts", async (req, res): Promise<void> => {
  const query = ListPartsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let rows = await db
    .select({
      id: partsTable.id,
      partNumber: partsTable.partNumber,
      description: partsTable.description,
      category: partsTable.category,
      unitPrice: partsTable.unitPrice,
      msrpPrice: partsTable.msrpPrice,
      ourCost: partsTable.ourCost,
      quantityInStock: partsTable.quantityInStock,
      supplierId: partsTable.supplierId,
      supplierName: suppliersTable.name,
      createdAt: partsTable.createdAt,
    })
    .from(partsTable)
    .leftJoin(suppliersTable, eq(partsTable.supplierId, suppliersTable.id))
    .orderBy(partsTable.partNumber);

  if (query.data.search) {
    const s = query.data.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.partNumber.toLowerCase().includes(s) ||
        r.description.toLowerCase().includes(s),
    );
  }

  if (query.data.category) {
    rows = rows.filter((r) => r.category === query.data.category);
  }

  res.json(rows.map(formatPart));
});

router.post("/parts", async (req, res): Promise<void> => {
  const parsed = CreatePartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [part] = await db
    .insert(partsTable)
    .values({
      partNumber: parsed.data.partNumber,
      description: parsed.data.description,
      category: parsed.data.category,
      unitPrice: parsed.data.unitPrice,
      msrpPrice: parsed.data.msrpPrice ?? null,
      ourCost: parsed.data.ourCost ?? null,
      quantityInStock: 0,
      supplierId: parsed.data.supplierId ?? null,
    })
    .returning();

  const supplier = part.supplierId
    ? await db
        .select()
        .from(suppliersTable)
        .where(eq(suppliersTable.id, part.supplierId))
        .then((r) => r[0])
    : null;

  res.status(201).json(formatPart({ ...part, supplierName: supplier?.name ?? null }));
});

router.get("/parts/:id", async (req, res): Promise<void> => {
  const params = GetPartParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({
      id: partsTable.id,
      partNumber: partsTable.partNumber,
      description: partsTable.description,
      category: partsTable.category,
      unitPrice: partsTable.unitPrice,
      msrpPrice: partsTable.msrpPrice,
      ourCost: partsTable.ourCost,
      quantityInStock: partsTable.quantityInStock,
      supplierId: partsTable.supplierId,
      supplierName: suppliersTable.name,
      createdAt: partsTable.createdAt,
    })
    .from(partsTable)
    .leftJoin(suppliersTable, eq(partsTable.supplierId, suppliersTable.id))
    .where(eq(partsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Part not found" });
    return;
  }

  res.json(formatPart(row));
});

router.put("/parts/:id", async (req, res): Promise<void> => {
  const params = UpdatePartParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.partNumber != null) updateData.partNumber = parsed.data.partNumber;
  if (parsed.data.description != null) updateData.description = parsed.data.description;
  if (parsed.data.category != null) updateData.category = parsed.data.category;
  if (parsed.data.unitPrice != null) updateData.unitPrice = parsed.data.unitPrice;
  if ("msrpPrice" in parsed.data) updateData.msrpPrice = parsed.data.msrpPrice ?? null;
  if ("ourCost" in parsed.data) updateData.ourCost = parsed.data.ourCost ?? null;
  if ("supplierId" in parsed.data) updateData.supplierId = parsed.data.supplierId ?? null;

  const [part] = await db
    .update(partsTable)
    .set(updateData)
    .where(eq(partsTable.id, params.data.id))
    .returning();

  if (!part) {
    res.status(404).json({ error: "Part not found" });
    return;
  }

  const supplier = part.supplierId
    ? await db
        .select()
        .from(suppliersTable)
        .where(eq(suppliersTable.id, part.supplierId))
        .then((r) => r[0])
    : null;

  res.json(formatPart({ ...part, supplierName: supplier?.name ?? null }));
});

router.delete("/parts/:id", async (req, res): Promise<void> => {
  const params = DeletePartParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [part] = await db
    .delete(partsTable)
    .where(eq(partsTable.id, params.data.id))
    .returning();

  if (!part) {
    res.status(404).json({ error: "Part not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

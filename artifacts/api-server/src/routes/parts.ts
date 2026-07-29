import { Router, type IRouter } from "express";
import { eq, ilike, or } from "drizzle-orm";
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

  res.json(
    rows.map((r) => ({
      ...r,
      unitPrice: r.unitPrice?.toString() ?? "0",
      createdAt: r.createdAt.toISOString(),
    })),
  );
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
      quantityInStock: parsed.data.quantityInStock,
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

  res.status(201).json({
    ...part,
    unitPrice: part.unitPrice?.toString() ?? "0",
    supplierName: supplier?.name ?? null,
    createdAt: part.createdAt.toISOString(),
  });
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

  res.json({
    ...row,
    unitPrice: row.unitPrice?.toString() ?? "0",
    createdAt: row.createdAt.toISOString(),
  });
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
  if (parsed.data.quantityInStock != null) updateData.quantityInStock = parsed.data.quantityInStock;
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

  res.json({
    ...part,
    unitPrice: part.unitPrice?.toString() ?? "0",
    supplierName: supplier?.name ?? null,
    createdAt: part.createdAt.toISOString(),
  });
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

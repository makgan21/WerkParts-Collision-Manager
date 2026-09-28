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

function formatPart(
  r: typeof partsTable.$inferSelect & { supplierName?: string | null },
) {
  return {
    ...r,
    packPrice: r.packPrice?.toString() ?? null,
    priceEach: r.priceEach?.toString() ?? null,
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
      packQuantity: partsTable.packQuantity,
      packPrice: partsTable.packPrice,
      priceEach: partsTable.priceEach,
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
      packQuantity: parsed.data.packQuantity ?? null,
      packPrice: parsed.data.packPrice ?? null,
      priceEach: parsed.data.priceEach ?? null,
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

  res
    .status(201)
    .json(formatPart({ ...part, supplierName: supplier?.name ?? null }));
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
      packQuantity: partsTable.packQuantity,
      packPrice: partsTable.packPrice,
      priceEach: partsTable.priceEach,
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

  if (parsed.data.partNumber != null) {
    updateData.partNumber = parsed.data.partNumber;
  }

  if (parsed.data.description != null) {
    updateData.description = parsed.data.description;
  }

  if ("packQuantity" in parsed.data) {
    updateData.packQuantity = parsed.data.packQuantity ?? null;
  }

  if ("packPrice" in parsed.data) {
    updateData.packPrice = parsed.data.packPrice ?? null;
  }

  if ("priceEach" in parsed.data) {
    updateData.priceEach = parsed.data.priceEach ?? null;
  }

  if ("supplierId" in parsed.data) {
    updateData.supplierId = parsed.data.supplierId ?? null;
  }

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

  res.json(
    formatPart({
      ...part,
      supplierName: supplier?.name ?? null,
    }),
  );
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
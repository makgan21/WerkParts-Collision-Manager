import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, crossReferencesTable } from "@workspace/db";

const router: IRouter = Router();

/**
 * GET all Cross References
 */
router.get("/cross-references", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(crossReferencesTable)
    .orderBy(
      crossReferencesTable.referenceType,
      crossReferencesTable.referenceNumber
    );

  res.json(rows);
});

/**
 * GET Cross References by Part ID
 */
router.get("/cross-references/:partId", async (req, res): Promise<void> => {
  const partId = Number(req.params.partId);

  if (Number.isNaN(partId)) {
    res.status(400).json({
      error: "Invalid Part ID",
    });
    return;
  }

  const rows = await db
    .select()
    .from(crossReferencesTable)
    .where(eq(crossReferencesTable.partId, partId))
    .orderBy(
      crossReferencesTable.referenceType,
      crossReferencesTable.referenceNumber
    );

  res.json(rows);
});

/**
 * CREATE a new Cross Reference
 */
router.post("/cross-references", async (req, res): Promise<void> => {
  const {
    partId,
    referenceType,
    referenceNumber,
    referenceDescription,
    referencePrice,
    notes,
  } = req.body;

  if (!partId || !referenceType || !referenceNumber) {
    res.status(400).json({
      error: "Missing required fields",
    });
    return;
  }

  const [newReference] = await db
    .insert(crossReferencesTable)
    .values({
      partId,
      referenceType,
      referenceNumber,
      referenceDescription: referenceDescription ?? null,
      referencePrice: referencePrice ?? null,
      notes: notes ?? null,
    })
    .returning();

  res.status(201).json(newReference);
});

/**
 * UPDATE a Cross Reference
 */
router.put("/cross-references/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    res.status(400).json({
      error: "Invalid ID",
    });
    return;
  }

  const {
    referenceType,
    referenceNumber,
    referenceDescription,
    referencePrice,
    notes,
  } = req.body;

  const [updatedReference] = await db
    .update(crossReferencesTable)
    .set({
      referenceType,
      referenceNumber,
      referenceDescription,
      referencePrice,
      notes,
    })
    .where(eq(crossReferencesTable.id, id))
    .returning();

  if (!updatedReference) {
    res.status(404).json({
      error: "Cross Reference not found",
    });
    return;
  }

  res.json(updatedReference);
});

/**
 * DELETE a Cross Reference
 */
router.delete("/cross-references/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    res.status(400).json({
      error: "Invalid ID",
    });
    return;
  }

  const [deletedReference] = await db
    .delete(crossReferencesTable)
    .where(eq(crossReferencesTable.id, id))
    .returning();

  if (!deletedReference) {
    res.status(404).json({
      error: "Cross Reference not found",
    });
    return;
  }

  res.sendStatus(204);
});

export default router;
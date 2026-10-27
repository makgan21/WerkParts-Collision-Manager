import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  techniciansTable,
  insuranceCompaniesTable,
  shopProfileTable,
} from "@workspace/db";
import {
  CreateTechnicianBody,
  UpdateTechnicianBody,
  UpdateTechnicianParams,
  DeleteTechnicianParams,
  CreateInsuranceCompanyBody,
  UpdateInsuranceCompanyBody,
  UpdateInsuranceCompanyParams,
  DeleteInsuranceCompanyParams,
  UpdateShopProfileBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ── Shop invoice branding ─────────────────────────────────────────────────────

router.get("/shop-profile", async (_req, res): Promise<void> => {
  const [profile] = await db
    .select({ logoDataUrl: shopProfileTable.logoDataUrl })
    .from(shopProfileTable)
    .where(eq(shopProfileTable.id, 1));

  res.json({ logoDataUrl: profile?.logoDataUrl ?? null });
});

router.put("/shop-profile", async (req, res): Promise<void> => {
  const parsed = UpdateShopProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { logoDataUrl } = parsed.data;
  if (
    logoDataUrl &&
    !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(logoDataUrl)
  ) {
    res.status(400).json({
      error: "Upload a PNG, JPEG, or WebP image to use as the invoice logo.",
    });
    return;
  }

  const [profile] = await db
    .insert(shopProfileTable)
    .values({ id: 1, logoDataUrl })
    .onConflictDoUpdate({
      target: shopProfileTable.id,
      set: { logoDataUrl },
    })
    .returning({ logoDataUrl: shopProfileTable.logoDataUrl });

  res.json({ logoDataUrl: profile.logoDataUrl });
});

// ── Technicians ──────────────────────────────────────────────────────────────

router.get("/technicians", async (_req, res): Promise<void> => {
  const rows = await db.select().from(techniciansTable).orderBy(techniciansTable.name);
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/technicians", async (req, res): Promise<void> => {
  const parsed = CreateTechnicianBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [row] = await db.insert(techniciansTable).values({ name: parsed.data.name }).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.put("/technicians/:id", async (req, res): Promise<void> => {
  const params = UpdateTechnicianParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdateTechnicianBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [row] = await db
    .update(techniciansTable)
    .set({ name: parsed.data.name })
    .where(eq(techniciansTable.id, params.data.id))
    .returning();

  if (!row) { res.status(404).json({ error: "Technician not found" }); return; }
  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/technicians/:id", async (req, res): Promise<void> => {
  const params = DeleteTechnicianParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [row] = await db.delete(techniciansTable).where(eq(techniciansTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Technician not found" }); return; }
  res.sendStatus(204);
});

// ── Insurance Companies ───────────────────────────────────────────────────────

router.get("/insurance-companies", async (_req, res): Promise<void> => {
  const rows = await db.select().from(insuranceCompaniesTable).orderBy(insuranceCompaniesTable.name);
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/insurance-companies", async (req, res): Promise<void> => {
  const parsed = CreateInsuranceCompanyBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [row] = await db.insert(insuranceCompaniesTable).values({ name: parsed.data.name }).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.put("/insurance-companies/:id", async (req, res): Promise<void> => {
  const params = UpdateInsuranceCompanyParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdateInsuranceCompanyBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [row] = await db
    .update(insuranceCompaniesTable)
    .set({ name: parsed.data.name })
    .where(eq(insuranceCompaniesTable.id, params.data.id))
    .returning();

  if (!row) { res.status(404).json({ error: "Insurance company not found" }); return; }
  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/insurance-companies/:id", async (req, res): Promise<void> => {
  const params = DeleteInsuranceCompanyParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [row] = await db
    .delete(insuranceCompaniesTable)
    .where(eq(insuranceCompaniesTable.id, params.data.id))
    .returning();
  if (!row) { res.status(404).json({ error: "Insurance company not found" }); return; }
  res.sendStatus(204);
});

export default router;

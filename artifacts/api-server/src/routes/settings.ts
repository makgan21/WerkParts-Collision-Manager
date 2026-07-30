import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, techniciansTable, insuranceCompaniesTable } from "@workspace/db";
import {
  CreateTechnicianBody,
  UpdateTechnicianBody,
  UpdateTechnicianParams,
  DeleteTechnicianParams,
  CreateInsuranceCompanyBody,
  UpdateInsuranceCompanyBody,
  UpdateInsuranceCompanyParams,
  DeleteInsuranceCompanyParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

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

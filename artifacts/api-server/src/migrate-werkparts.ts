import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";

type ExportedInvoiceItem = {
  id: number;
  invoiceId: number;
  partId: number | null;
  partNumber: string;
  description: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  createdAt?: string;
};

type ExportedInvoice = {
  id: number;
  invoiceNumber: string;
  roNumber: string;
  date: string;
  techName: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  insuranceCompany: string;
  status: string;
  totalAmount: string;
  notes: string | null;
  createdAt: string;
};

type ExportedSupplier = {
  id: number;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  createdAt?: string;
};

type ExportedTechnician = {
  id: number;
  name: string;
  createdAt?: string;
};

type ExportedInsuranceCompany = {
  id: number;
  name: string;
  createdAt?: string;
};

type ExportedPart = {
  id: number;
  partNumber: string;
  description: string;
  packQuantity?: number | null;
  packPrice?: string | null;
  priceEach?: string | null;
  supplierId?: number | null;
  createdAt?: string;
};

type ExportedCrossReference = {
  id: number;
  partId: number;
  referenceType: string;
  referenceNumber: string;
  referenceDescription?: string | null;
  referencePrice?: string | null;
  notes?: string | null;
  createdAt?: string;
};

type PostgresExport = {
  invoices: ExportedInvoice[];
  invoiceItems: ExportedInvoiceItem[];
  parts: ExportedPart[];
  suppliers: ExportedSupplier[];
  technicians: ExportedTechnician[];
  insuranceCompanies: ExportedInsuranceCompany[];
  crossReferences: ExportedCrossReference[];
};

const projectRoot = path.resolve(import.meta.dirname, "../../..");
const sourcePath = path.resolve(
  process.argv[2] ??
    path.join(projectRoot, ".local", "werkparts-migration", "postgres-export.json.gz"),
);
const privateDatabasePath = path.join(
  projectRoot,
  "artifacts",
  "api-server",
  ".data",
  "werkparts-private.sqlite",
);
const catalogDatabasePath = path.join(
  projectRoot,
  "artifacts",
  "werkparts",
  "desktop",
  "catalog-seed.sqlite",
);

if (!existsSync(sourcePath)) {
  throw new Error(`PostgreSQL export not found: ${sourcePath}`);
}

process.env.WERKPARTS_DB_PATH = privateDatabasePath;
const {
  createDatabase,
  db,
  sqliteClient,
  suppliersTable,
  partsTable,
  invoicesTable,
  invoiceItemsTable,
  techniciansTable,
  insuranceCompaniesTable,
  crossReferencesTable,
  shopProfileTable,
  closeDatabase,
} = await import("@workspace/db");

const catalogDatabase = createDatabase(catalogDatabasePath);
const sourceBytes = readFileSync(sourcePath);
const sourceText = sourcePath.endsWith(".gz")
  ? gunzipSync(sourceBytes).toString("utf8")
  : sourceBytes.toString("utf8");
const data = JSON.parse(sourceText) as PostgresExport;
const now = () => new Date();
const asDate = (value?: string) => (value ? new Date(value) : now());
const invoiceSequenceByRo = new Map<string, number>();
const normalizedInvoices = [...data.invoices]
  .sort(
    (left, right) =>
      Date.parse(left.createdAt) - Date.parse(right.createdAt) ||
      left.id - right.id,
  )
  .map((invoice) => {
    const roNumber = invoice.roNumber.trim();
    const sequence = (invoiceSequenceByRo.get(roNumber) ?? 0) + 1;
    invoiceSequenceByRo.set(roNumber, sequence);
    return {
      ...invoice,
      roNumber,
      invoiceNumber: `WP-${roNumber}-${sequence}`,
    };
  });

async function assertEmpty(database: typeof db, label: string) {
  const checks = await Promise.all([
    database.select({ id: suppliersTable.id }).from(suppliersTable).limit(1),
    database.select({ id: partsTable.id }).from(partsTable).limit(1),
    database.select({ id: invoicesTable.id }).from(invoicesTable).limit(1),
    database.select({ id: techniciansTable.id }).from(techniciansTable).limit(1),
    database.select({ id: insuranceCompaniesTable.id }).from(insuranceCompaniesTable).limit(1),
    database.select({ id: crossReferencesTable.id }).from(crossReferencesTable).limit(1),
    database.select({ id: shopProfileTable.id }).from(shopProfileTable).limit(1),
  ]);

  if (checks.some((rows) => rows.length > 0)) {
    throw new Error(`${label} already contains records; refusing to overwrite it.`);
  }
}

async function insertInBatches(
  database: typeof db,
  table: any,
  rows: Record<string, unknown>[],
) {
  for (let offset = 0; offset < rows.length; offset += 400) {
    await database.insert(table).values(rows.slice(offset, offset + 400));
  }
}

function countRows(tableName: string, client: typeof sqliteClient = sqliteClient) {
  const allowedTables = new Set([
    "suppliers",
    "parts",
    "invoices",
    "invoice_items",
    "technicians",
    "insurance_companies",
    "cross_references",
    "shop_profile",
  ]);
  if (!allowedTables.has(tableName)) throw new Error("Unexpected table name");
  const result = client
    .prepare(`SELECT COUNT(*) AS count FROM ${tableName}`)
    .get() as { count: number };
  return Number(result.count);
}

try {
  await assertEmpty(db, "The private SQLite database");
  await assertEmpty(catalogDatabase.db, "The installer catalog");

  const originalLogoPath = path.join(
    projectRoot,
    "artifacts",
    "werkparts",
    "src",
    "assets",
    "werkheiser-logo.png",
  );
  const privateLogoDataUrl = `data:image/png;base64,${readFileSync(originalLogoPath).toString("base64")}`;
  const invoiceItems = data.invoiceItems.map((item) => ({
    ...item,
    createdAt: asDate(item.createdAt),
  }));

  sqliteClient.exec("BEGIN IMMEDIATE");
  try {
    await insertInBatches(
      db,
      suppliersTable,
      data.suppliers.map((supplier) => ({
        id: supplier.id,
        name: supplier.name,
        contactName: supplier.contactName ?? null,
        phone: supplier.phone ?? null,
        email: supplier.email ?? null,
        address: supplier.address ?? null,
        createdAt: asDate(supplier.createdAt),
      })),
    );
    await insertInBatches(
      db,
      partsTable,
      data.parts.map((part) => ({
        id: part.id,
        partNumber: part.partNumber,
        description: part.description,
        packQuantity: part.packQuantity ?? null,
        packPrice: part.packPrice ?? null,
        priceEach: part.priceEach ?? null,
        supplierId: part.supplierId ?? null,
        createdAt: asDate(part.createdAt),
      })),
    );
    await insertInBatches(
      db,
      invoicesTable,
      normalizedInvoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        roNumber: invoice.roNumber,
        date: invoice.date,
        techName: invoice.techName,
        vehicleYear: invoice.vehicleYear,
        vehicleMake: invoice.vehicleMake,
        vehicleModel: invoice.vehicleModel,
        insuranceCompany: invoice.insuranceCompany,
        status: invoice.status,
        totalAmount: invoice.totalAmount,
        notes: invoice.notes ?? null,
        createdAt: asDate(invoice.createdAt),
      })),
    );
    await insertInBatches(db, invoiceItemsTable, invoiceItems);
    await insertInBatches(
      db,
      techniciansTable,
      data.technicians.map((technician) => ({
        id: technician.id,
        name: technician.name,
        createdAt: asDate(technician.createdAt),
      })),
    );
    await insertInBatches(
      db,
      insuranceCompaniesTable,
      data.insuranceCompanies.map((company) => ({
        id: company.id,
        name: company.name,
        createdAt: asDate(company.createdAt),
      })),
    );
    await insertInBatches(
      db,
      crossReferencesTable,
      data.crossReferences.map((reference) => ({
        ...reference,
        createdAt: asDate(reference.createdAt),
      })),
    );
    await db.insert(shopProfileTable).values({
      id: 1,
      logoDataUrl: privateLogoDataUrl,
    });
    sqliteClient.exec("COMMIT");
  } catch (error) {
    sqliteClient.exec("ROLLBACK");
    throw error;
  }

  const catalogSuppliers = data.suppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
    contactName: null,
    phone: null,
    email: null,
    address: null,
    createdAt: asDate(supplier.createdAt),
  }));
  const catalogParts = data.parts.map((part) => ({
    id: part.id,
    partNumber: part.partNumber,
    description: part.description,
    packQuantity: part.packQuantity ?? null,
    packPrice: part.packPrice ?? null,
    priceEach: part.priceEach ?? null,
    supplierId: part.supplierId ?? null,
    createdAt: asDate(part.createdAt),
  }));
  const catalogCrossReferences = data.crossReferences.map((reference) => ({
    ...reference,
    createdAt: asDate(reference.createdAt),
  }));

  catalogDatabase.client.exec("BEGIN IMMEDIATE");
  try {
    await insertInBatches(catalogDatabase.db, suppliersTable, catalogSuppliers);
    await insertInBatches(catalogDatabase.db, partsTable, catalogParts);
    await insertInBatches(
      catalogDatabase.db,
      crossReferencesTable,
      catalogCrossReferences,
    );
    catalogDatabase.client.exec("COMMIT");
  } catch (error) {
    catalogDatabase.client.exec("ROLLBACK");
    throw error;
  }

  const stats = {
    privateInvoices: countRows("invoices"),
    privateInvoiceItems: countRows("invoice_items"),
    privateParts: countRows("parts"),
    privateSuppliers: countRows("suppliers"),
    privateTechnicians: countRows("technicians"),
    privateInsurers: countRows("insurance_companies"),
    privateCrossReferences: countRows("cross_references"),
    privateShopProfiles: countRows("shop_profile"),
    installerParts: countRows("parts", catalogDatabase.client),
    installerSuppliers: countRows("suppliers", catalogDatabase.client),
    installerCrossReferences: countRows(
      "cross_references",
      catalogDatabase.client,
    ),
    installerInvoices: countRows("invoices", catalogDatabase.client),
    installerInvoiceItems: countRows("invoice_items", catalogDatabase.client),
    installerTechnicians: countRows("technicians", catalogDatabase.client),
    installerInsurers: countRows(
      "insurance_companies",
      catalogDatabase.client,
    ),
    installerShopProfiles: countRows("shop_profile", catalogDatabase.client),
  };

  const expectedInvoiceItems = data.invoiceItems.length;
  if (
    stats.privateInvoices !== data.invoices.length ||
    stats.privateInvoiceItems !== expectedInvoiceItems ||
    stats.privateParts !== data.parts.length ||
    stats.privateSuppliers !== data.suppliers.length ||
    stats.privateTechnicians !== data.technicians.length ||
    stats.privateInsurers !== data.insuranceCompanies.length ||
    stats.privateCrossReferences !== data.crossReferences.length ||
    stats.privateShopProfiles !== 1 ||
    stats.installerParts !== data.parts.length ||
    stats.installerSuppliers !== data.suppliers.length ||
    stats.installerCrossReferences !== data.crossReferences.length ||
    stats.installerInvoices !== 0
    || stats.installerInvoiceItems !== 0
    || stats.installerTechnicians !== 0
    || stats.installerInsurers !== 0
    || stats.installerShopProfiles !== 0
  ) {
    throw new Error("SQLite import verification failed; inspect the database before using it.");
  }

  console.log(JSON.stringify({ privateDatabasePath, catalogDatabasePath, stats }));
} finally {
  catalogDatabase.client.close();
  closeDatabase();
}

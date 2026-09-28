import { useState, useRef } from "react";
import {
  useListParts, useCreatePart, useUpdatePart, useDeletePart, useListSuppliers,
  getListPartsQueryKey,
  useListCrossReferencesByPart, useCreateCrossReference, useUpdateCrossReference,
  useDeleteCrossReference, getListCrossReferencesByPartQueryKey,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, Edit2, Trash2, Upload, Link2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const selectClass =
  "flex h-10 w-full rounded-sm border-2 border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-primary";

const IMPORT_ALIASES = {
  partNumber: [
    "part number", "part no", "part num", "part#", "partnumber", "part",
    "auveco part #", "auveco part number", "auveco part no",
    "sku", "item number", "item no", "product code", "product id", "code",
  ],
  description: ["description", "desc", "part description", "item description", "name", "details"],
  packQuantity: [
    "pack quantity", "pack qty", "packquantity", "pack_quantity",
    "quantity per pack", "qty per pack", "package quantity", "pack size",
    "quantity", "qty",
  ],
  packPrice: [
    "pack price", "packprice", "pack_price", "price per pack",
    "package price", "case price", "pack cost", "case cost", "price",
  ],
  priceEach: [
    "price each", "priceeach", "price_each", "unit price", "unit cost",
    "cost each", "cost per unit", "cost per part", "our cost", "cost",
    "purchase price", "buy price",
  ],
  customerPrice: [
    "customer price", "retail price", "selling price", "sell price",
    "msrp", "msrp price", "list price",
  ],
  supplier: ["supplier", "vendor", "manufacturer"],
} as const;

const normalizeHeader = (value: unknown) =>
  String(value ?? "")
    .replace(/\u00a0/g, " ")
    .toLowerCase()
    .replace(/[_./-]+/g, " ")
    .replace(/[^a-z0-9#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const compactHeader = (value: unknown) => normalizeHeader(value).replace(/[^a-z0-9]/g, "");

const findColumn = (headers: string[], aliases: readonly string[]) => {
  const exactAliases = aliases.map(compactHeader);
  const exactIndex = headers.findIndex((header) => exactAliases.includes(compactHeader(header)));
  if (exactIndex >= 0) return exactIndex;

  return headers.findIndex((header) => {
    const normalized = compactHeader(header);
    return normalized.length > 2 && aliases.some((alias) => {
      const compactAlias = compactHeader(alias);
      return normalized.includes(compactAlias) || compactAlias.includes(normalized);
    });
  });
};

const findHeaderRow = (rows: unknown[][]) => {
  const candidates: { index: number; headers: string[]; score: number }[] = [];

  rows.slice(0, 20).forEach((row, index) => {
    const headers = row.map(normalizeHeader);
    const matchedFields = Object.values(IMPORT_ALIASES).filter(
      (aliases) => findColumn(headers, aliases) >= 0,
    ).length;
    const hasPartNumber = findColumn(headers, IMPORT_ALIASES.partNumber) >= 0;
    const hasDescription = findColumn(headers, IMPORT_ALIASES.description) >= 0;
    const score = matchedFields + (hasPartNumber ? 4 : 0) + (hasDescription ? 4 : 0);

    candidates.push({ index, headers, score });
  });

  const best = candidates.sort((a, b) => b.score - a.score)[0];
  if (!best || best.score < 6 || findColumn(best.headers, IMPORT_ALIASES.partNumber) < 0) {
    return null;
  }
  return best;
};

const readCell = (row: unknown[], index: number) =>
  index >= 0 ? String(row[index] ?? "").trim() : "";

const parseNumber = (value: string) => {
  const cleaned = value.replace(/[$€£,\s]/g, "").replace(/[^\d.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const parsePrice = (value: string) => {
  const parsed = parseNumber(value);
  return parsed == null ? null : parsed.toFixed(2);
};

function CrossReferenceDialog({
  part,
  onClose,
}: {
  part: any;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [referenceNumber, setReferenceNumber] = useState("");
  const [editingReferenceId, setEditingReferenceId] = useState<number | null>(null);

  const { data: references, isLoading } = useListCrossReferencesByPart(part.id);

  const invalidateReferences = () => {
    queryClient.invalidateQueries({
      queryKey: getListCrossReferencesByPartQueryKey(part.id),
    });
  };

  const createReference = useCreateCrossReference({
    mutation: {
      onSuccess: () => {
        invalidateReferences();
        setReferenceNumber("");
        toast.success("OEM cross-reference added");
      },
      onError: (err: any) => toast.error(err?.error || "Failed to add cross-reference"),
    },
  });

  const updateReference = useUpdateCrossReference({
    mutation: {
      onSuccess: () => {
        invalidateReferences();
        setReferenceNumber("");
        setEditingReferenceId(null);
        toast.success("OEM cross-reference updated");
      },
      onError: (err: any) => toast.error(err?.error || "Failed to update cross-reference"),
    },
  });

  const deleteReference = useDeleteCrossReference({
    mutation: {
      onSuccess: () => {
        invalidateReferences();
        toast.success("OEM cross-reference deleted");
      },
      onError: (err: any) => toast.error(err?.error || "Failed to delete cross-reference"),
    },
  });

  const resetForm = () => {
    setReferenceNumber("");
    setEditingReferenceId(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalizedNumber = referenceNumber.trim();
    if (!normalizedNumber) return;

    const duplicate = references?.some(
      (reference) =>
        reference.id !== editingReferenceId &&
        reference.referenceNumber.trim().toLowerCase() === normalizedNumber.toLowerCase(),
    );
    if (duplicate) {
      toast.error("That OEM number is already linked to this part.");
      return;
    }

    const data = {
      partId: part.id,
      referenceType: "OEM",
      referenceNumber: normalizedNumber,
      referenceDescription: null,
      referencePrice: null,
      notes: null,
    };

    if (editingReferenceId) {
      updateReference.mutate({ id: editingReferenceId, data });
    } else {
      createReference.mutate({ data });
    }
  };

  const startEditing = (reference: any) => {
    setEditingReferenceId(reference.id);
    setReferenceNumber(reference.referenceNumber);
  };

  const isSaving = createReference.isPending || updateReference.isPending;

  return (
    <Dialog
      open={!!part}
      onOpenChange={(open) => {
        if (!open) {
          resetForm();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>OEM Cross-References</DialogTitle>
          <p className="text-sm text-muted-foreground">
            OEM numbers linked to Auveco part{" "}
            <span className="font-mono font-bold text-foreground">{part.partNumber}</span>
          </p>
        </DialogHeader>

        <div className="space-y-3">
          {isLoading ? (
            <p className="py-4 text-sm text-muted-foreground">Loading cross-references...</p>
          ) : references?.length ? (
            <div className="divide-y divide-border rounded-sm border border-border">
              {references.map((reference) => (
                <div key={reference.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <div className="font-mono font-bold text-primary">{reference.referenceNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      Enter this OEM number on an invoice to use this part&apos;s description and price.
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit OEM number ${reference.referenceNumber}`}
                      onClick={() => startEditing(reference)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete OEM number ${reference.referenceNumber}`}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Delete OEM cross-reference ${reference.referenceNumber}?`)) {
                          deleteReference.mutate({ id: reference.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-sm border border-dashed border-border px-3 py-5 text-center text-sm text-muted-foreground">
              No OEM cross-references yet.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 border-t border-border pt-4">
          <Label htmlFor="referenceNumber">
            {editingReferenceId ? "Edit OEM Number" : "Add OEM Number"}
          </Label>
          <div className="flex gap-2">
            <Input
              id="referenceNumber"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Enter OEM part number"
              autoFocus
              required
            />
            <Button type="submit" disabled={isSaving || !referenceNumber.trim()}>
              {editingReferenceId ? "Save" : "Add"}
            </Button>
            {editingReferenceId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Parts() {
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<any>(null);
  const [crossReferencePart, setCrossReferencePart] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  const { data: parts, isLoading } = useListParts({ search: search || undefined });

  const { data: suppliers } = useListSuppliers();
  const auvecoSupplier = suppliers?.find(
    (supplier) => supplier.name.trim().toLowerCase() === "auveco",
  );

  const createPart = useCreatePart({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPartsQueryKey() });
        toast.success("Part created");
        setIsAddOpen(false);
      },
      onError: (err: any) => toast.error(err?.error || "Failed to create part"),
    },
  });

  const updatePart = useUpdatePart({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPartsQueryKey() });
        toast.success("Part updated");
        setEditingPart(null);
      },
      onError: (err: any) => toast.error(err?.error || "Failed to update part"),
    },
  });

  const deletePart = useDeletePart({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPartsQueryKey() });
        toast.success("Part deleted");
      },
      onError: (err: any) => toast.error(err?.error || "Failed to delete part"),
    },
  });

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const data = {
      partNumber: fd.get("partNumber") as string,
      description: fd.get("description") as string,
      packQuantity: fd.get("packQuantity")
        ? Number(fd.get("packQuantity"))
        : null,
      packPrice: (fd.get("packPrice") as string) || null,
      priceEach: (fd.get("priceEach") as string) || null,
      supplierId: fd.get("supplierId")
        ? Number(fd.get("supplierId"))
        : auvecoSupplier?.id ?? null,
    };

    if (editingPart) {
      updatePart.mutate({ id: editingPart.id, data });
    } else {
      createPart.mutate({ data });
    }
  };

  // ── CSV / Excel Import ────────────────────────────────────────────────────────
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset so same file can be re-imported
    setIsImporting(true);

    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: false,
        raw: false,
      });

      const sheets = workbook.SheetNames.map((name) => {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
          header: 1,
          defval: "",
          raw: false,
        }) as unknown[][];
        return { name, rows, header: findHeaderRow(rows) };
      });
      const selectedSheet = sheets
        .filter((sheet) => sheet.header)
        .sort((a, b) => {
          const scoreDifference = (b.header?.score ?? 0) - (a.header?.score ?? 0);
          return scoreDifference || b.rows.length - a.rows.length;
        })[0];

      if (!selectedSheet?.header) {
        toast.error("Could not identify Part Number and Description columns in this file.");
        return;
      }

      const { index: headerIndex, headers } = selectedSheet.header;
      const columns = {
        partNumber: findColumn(headers, IMPORT_ALIASES.partNumber),
        description: findColumn(headers, IMPORT_ALIASES.description),
        packQuantity: findColumn(headers, IMPORT_ALIASES.packQuantity),
        packPrice: findColumn(headers, IMPORT_ALIASES.packPrice),
        priceEach: findColumn(headers, IMPORT_ALIASES.priceEach),
        customerPrice: findColumn(headers, IMPORT_ALIASES.customerPrice),
        supplier: findColumn(headers, IMPORT_ALIASES.supplier),
      };

      let success = 0;
      let errors = 0;

      for (const row of selectedSheet.rows.slice(headerIndex + 1)) {
        if (!row.some((cell) => String(cell ?? "").trim())) continue;

        const partNumber = readCell(row, columns.partNumber);
        const description = readCell(row, columns.description);

        if (!partNumber || !description) {
          errors++;
          continue;
        }

        const packQuantity = parseNumber(readCell(row, columns.packQuantity));
        const packPrice = parsePrice(readCell(row, columns.packPrice));
        let priceEach = parsePrice(readCell(row, columns.priceEach));

        // If a file only provides retail/customer pricing, convert it back to
        // the stored cost so the existing Customer Price calculation remains consistent.
        if (!priceEach) {
          const customerPrice = parseNumber(readCell(row, columns.customerPrice));
          if (customerPrice != null) priceEach = (customerPrice * 0.6).toFixed(4);
        }

        const supplierName = readCell(row, columns.supplier).toLowerCase();
        const supplier = suppliers?.find(
          (candidate) => candidate.name.trim().toLowerCase() === supplierName,
        ) ?? auvecoSupplier;

        try {
          await createPart.mutateAsync({
            data: {
              partNumber,
              description,
              packQuantity: packQuantity == null ? null : Math.round(packQuantity),
              packPrice,
              priceEach,
              supplierId: supplier?.id ?? null,
            },
          });
          success++;
        } catch {
          errors++;
        }
      }

      queryClient.invalidateQueries({ queryKey: getListPartsQueryKey() });
      if (success > 0) {
        toast.success(
          `Imported ${success} part${success !== 1 ? "s" : ""}` +
          (errors > 0 ? ` (${errors} skipped)` : "") +
          ` from ${selectedSheet.name}`,
        );
      } else {
        toast.error(`Import failed — ${errors} row${errors !== 1 ? "s" : ""} had errors.`);
      }
    } catch {
      toast.error("Could not read this file. Please choose a CSV, XLS, or XLSX file.");
    } finally {
      setIsImporting(false);
    }
  };

  // ── Part Form ─────────────────────────────────────────────────────────────────
  const PartForm = ({ part }: { part?: any }) => (
    <form onSubmit={handleSave} className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="partNumber">Part Number</Label>
          <Input id="partNumber" name="partNumber" defaultValue={part?.partNumber} required />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" name="description" defaultValue={part?.description} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="packQuantity">Pack Quantity</Label>
          <Input
            id="packQuantity"
            name="packQuantity"
            type="number"
            step="1"
            min="1"
            defaultValue={part?.packQuantity ?? ""}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="packPrice">Pack Price</Label>
          <Input
            id="packPrice"
            name="packPrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={part?.packPrice ?? ""}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priceEach">Price Each</Label>
          <Input
            id="priceEach"
            name="priceEach"
            type="number"
            step="0.0001"
            min="0"
            defaultValue={part?.priceEach ?? ""}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label>Customer Price</Label>
          <div className="flex h-10 w-full items-center rounded-sm border-2 border-input bg-muted px-3 text-sm">
            {part?.priceEach
              ? formatCurrency(Number(part.priceEach) / 0.60)
              : "—"}
          </div>
          <p className="text-xs text-muted-foreground">
            40% gross profit margin
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplierId">Supplier</Label>
          <select
            id="supplierId"
            name="supplierId"
            defaultValue={part?.supplierId || ""}
            className={selectClass}
          >
            <option value="">— None —</option>
            {suppliers?.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => { setIsAddOpen(false); setEditingPart(null); }}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={createPart.isPending || updatePart.isPending}>
          {part ? "Save Changes" : "Create Part"}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Parts Catalog</h1>
          <p className="text-muted-foreground">Manage fasteners, clips, and pricing.</p>
        </div>
        <div className="flex gap-2">
          {/* CSV / Excel Import */}
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleFileImport}
          />
          <Button
            variant="outline"
            className="gap-2"
            disabled={isImporting}
            onClick={() => csvInputRef.current?.click()}
          >
            <Upload className="w-4 h-4" />
            {isImporting ? "Importing…" : "Import File"}
          </Button>

          {/* Add Part */}
          <Button className="gap-2" onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4" /> New Part
          </Button>
        </div>
      </div>

      {/* Import format hint */}
      <p className="text-xs text-muted-foreground -mt-4">
        Import CSV, XLS, or XLSX files. Required columns are detected automatically:{" "}
        <span className="font-mono">
          Part Number, Description
        </span>
      </p>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search part number or desc..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part #</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Pack Qty</TableHead>
              <TableHead className="text-right">Pack Price</TableHead>
              <TableHead className="text-right">Price Each</TableHead>
              <TableHead className="text-right">Customer Price</TableHead>
              <TableHead className="w-[140px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading parts...
                </TableCell>
              </TableRow>
            ) : parts?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No parts found.
                </TableCell>
              </TableRow>
            ) : (
              parts?.map((part) => (
                <TableRow key={part.id}>
                  <TableCell className="font-mono font-bold text-primary">
                    {part.partNumber}
                  </TableCell>
                  <TableCell className="font-medium">
                    {part.description}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {part.supplierName || "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {part.packQuantity ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {part.packPrice ? formatCurrency(part.packPrice) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {part.priceEach ? formatCurrency(part.priceEach) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {part.priceEach
                      ? formatCurrency(Number(part.priceEach) / 0.60)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${part.partNumber}`}
                        onClick={() => setEditingPart(part)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Manage cross-references for ${part.partNumber}`}
                        onClick={() => setCrossReferencePart(part)}
                      >
                        <Link2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${part.partNumber}`}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm("Delete this part?")) {
                            deletePart.mutate({ id: part.id });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Part</DialogTitle>
          </DialogHeader>
          <PartForm />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingPart} onOpenChange={(open) => !open && setEditingPart(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Part: {editingPart?.partNumber}</DialogTitle>
          </DialogHeader>
          {editingPart && <PartForm part={editingPart} />}
        </DialogContent>
      </Dialog>

      {crossReferencePart && (
        <CrossReferenceDialog
          part={crossReferencePart}
          onClose={() => setCrossReferencePart(null)}
        />
      )}
    </div>
  );
}
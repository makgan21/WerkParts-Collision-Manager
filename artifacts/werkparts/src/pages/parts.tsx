import { useState, useRef } from "react";
import {
  useListParts, useCreatePart, useUpdatePart, useDeletePart, useListSuppliers,
  getListPartsQueryKey,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit2, Trash2, Upload } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const selectClass =
  "flex h-10 w-full rounded-sm border-2 border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-primary";

const CATEGORIES = ["clip", "retainer", "nut", "bolt", "other"];

export default function Parts() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  const { data: parts, isLoading } = useListParts({
    search: search || undefined,
    category: categoryFilter || undefined,
  });

  const { data: suppliers } = useListSuppliers();

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
      category: fd.get("category") as string,
      unitPrice: fd.get("unitPrice") as string,
      msrpPrice: (fd.get("msrpPrice") as string) || null,
      ourCost: (fd.get("ourCost") as string) || null,
      supplierId: fd.get("supplierId") ? Number(fd.get("supplierId")) : null,
    };

    if (editingPart) updatePart.mutate({ id: editingPart.id, data });
    else createPart.mutate({ data });
  };

  // ── CSV Import ────────────────────────────────────────────────────────────────
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset so same file can be re-imported
    setIsImporting(true);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error("CSV must have a header row and at least one data row.");
        return;
      }

      const headers = lines[0]
        .toLowerCase()
        .split(",")
        .map((h) => h.trim().replace(/^"|"$/g, ""));

      const col = (row: string[], names: string[]) => {
        for (const name of names) {
          const idx = headers.indexOf(name);
          if (idx >= 0) return row[idx]?.trim().replace(/^"|"$/g, "") || "";
        }
        return "";
      };

      let success = 0;
      let errors = 0;

      for (const line of lines.slice(1)) {
        if (!line.trim()) continue;
        const values = line.split(",");
        const partNumber = col(values, ["part number", "part#", "partnumber", "part_number", "sku"]);
        const description = col(values, ["description", "desc", "name"]);
        const category = col(values, ["category", "cat", "type"]) || "other";
        const unitPrice = col(values, ["unit price", "unitprice", "price", "unit_price", "retail"]);
        const msrpPrice = col(values, ["msrp", "msrp price", "msrpprice", "msrp_price"]) || null;
        const ourCost = col(values, ["our cost", "ourcost", "cost", "our_cost", "dealer cost"]) || null;

        if (!partNumber || !description || !unitPrice) { errors++; continue; }

        try {
          await createPart.mutateAsync({
            data: {
              partNumber,
              description,
              category: CATEGORIES.includes(category.toLowerCase()) ? category.toLowerCase() : "other",
              unitPrice,
              msrpPrice: msrpPrice || null,
              ourCost: ourCost || null,
            },
          });
          success++;
        } catch {
          errors++;
        }
      }

      queryClient.invalidateQueries({ queryKey: getListPartsQueryKey() });
      if (success > 0) toast.success(`Imported ${success} part${success !== 1 ? "s" : ""}${errors > 0 ? ` (${errors} skipped)` : ""}`);
      else toast.error(`Import failed — ${errors} row${errors !== 1 ? "s" : ""} had errors. Check Part #, Description, and Price columns.`);
    } catch (err) {
      toast.error("Failed to read CSV file.");
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
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            name="category"
            defaultValue={part?.category || "clip"}
            className={selectClass}
            required
          >
            <option value="clip">Clip</option>
            <option value="retainer">Retainer</option>
            <option value="nut">Nut</option>
            <option value="bolt">Bolt</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" name="description" defaultValue={part?.description} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unitPrice">Retail / OEM Price</Label>
          <Input id="unitPrice" name="unitPrice" type="number" step="0.01" defaultValue={part?.unitPrice} required placeholder="0.00" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="msrpPrice">MSRP Price</Label>
          <Input id="msrpPrice" name="msrpPrice" type="number" step="0.01" defaultValue={part?.msrpPrice || ""} placeholder="0.00 (optional)" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ourCost">Our Cost</Label>
          <Input id="ourCost" name="ourCost" type="number" step="0.01" defaultValue={part?.ourCost || ""} placeholder="0.00 (optional)" />
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
          {/* CSV Import */}
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleCSVImport}
          />
          <Button
            variant="outline"
            className="gap-2"
            disabled={isImporting}
            onClick={() => csvInputRef.current?.click()}
          >
            <Upload className="w-4 h-4" />
            {isImporting ? "Importing…" : "Import CSV"}
          </Button>

          {/* Add Part */}
          <Button className="gap-2" onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4" /> New Part
          </Button>
        </div>
      </div>

      {/* CSV format hint */}
      <p className="text-xs text-muted-foreground -mt-4">
        CSV columns: <span className="font-mono">Part Number, Description, Category, Unit Price, MSRP Price, Our Cost</span>
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
        <select
          className={`${selectClass} max-w-[200px]`}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="clip">Clip</option>
          <option value="retainer">Retainer</option>
          <option value="nut">Nut</option>
          <option value="bolt">Bolt</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part #</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Retail / OEM</TableHead>
              <TableHead className="text-right">MSRP</TableHead>
              <TableHead className="text-right">Our Cost</TableHead>
              <TableHead className="w-[90px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">Loading parts...</TableCell>
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
                  <TableCell className="font-mono font-bold text-primary">{part.partNumber}</TableCell>
                  <TableCell className="font-medium">{part.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{part.category}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{part.supplierName || "—"}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(part.unitPrice)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {part.msrpPrice ? formatCurrency(part.msrpPrice) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {part.ourCost ? formatCurrency(part.ourCost) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditingPart(part)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm("Delete this part?")) deletePart.mutate({ id: part.id });
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
    </div>
  );
}

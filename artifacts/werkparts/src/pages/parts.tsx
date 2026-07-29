import { useState } from "react";
import { useListParts, useCreatePart, useUpdatePart, useDeletePart, useListSuppliers } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit2, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getListPartsQueryKey } from "@workspace/api-client-react";

export default function Parts() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<any>(null);

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
        toast.success("Part created successfully");
        setIsAddOpen(false);
      },
      onError: (err: any) => toast.error(err?.error || "Failed to create part")
    }
  });

  const updatePart = useUpdatePart({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPartsQueryKey() });
        toast.success("Part updated successfully");
        setEditingPart(null);
      },
      onError: (err: any) => toast.error(err?.error || "Failed to update part")
    }
  });

  const deletePart = useDeletePart({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPartsQueryKey() });
        toast.success("Part deleted");
      },
      onError: (err: any) => toast.error(err?.error || "Failed to delete part")
    }
  });

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      partNumber: formData.get("partNumber") as string,
      description: formData.get("description") as string,
      category: formData.get("category") as string,
      unitPrice: formData.get("unitPrice") as string,
      quantityInStock: Number(formData.get("quantityInStock")),
      supplierId: formData.get("supplierId") ? Number(formData.get("supplierId")) : null,
    };

    if (editingPart) {
      updatePart.mutate({ id: editingPart.id, data });
    } else {
      createPart.mutate({ data });
    }
  };

  const PartForm = ({ part }: { part?: any }) => (
    <form onSubmit={handleSave} className="space-y-4 pt-4">
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
            className="flex h-10 w-full rounded-sm border-2 border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-primary"
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
          <Label htmlFor="unitPrice">Unit Price</Label>
          <Input id="unitPrice" name="unitPrice" type="number" step="0.01" defaultValue={part?.unitPrice} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantityInStock">Stock Quantity</Label>
          <Input id="quantityInStock" name="quantityInStock" type="number" defaultValue={part?.quantityInStock || 0} required />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="supplierId">Supplier</Label>
          <select 
            id="supplierId" 
            name="supplierId" 
            defaultValue={part?.supplierId || ""}
            className="flex h-10 w-full rounded-sm border-2 border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-primary"
          >
            <option value="">-- None --</option>
            {suppliers?.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); setEditingPart(null); }}>Cancel</Button>
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
          <p className="text-muted-foreground">Manage fasteners, clips, and inventory levels.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> New Part</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Part</DialogTitle>
            </DialogHeader>
            <PartForm />
          </DialogContent>
        </Dialog>
      </div>

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
          className="flex h-10 w-full max-w-[200px] rounded-sm border-2 border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-primary"
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

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part #</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading parts...</TableCell></TableRow>
            ) : parts?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No parts found.</TableCell></TableRow>
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
                  <TableCell className="text-right">
                    <span className={`font-mono font-bold ${part.quantityInStock < 10 ? 'text-destructive' : ''}`}>
                      {part.quantityInStock}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setEditingPart(part)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => {
                        if (confirm("Are you sure you want to delete this part?")) {
                          deletePart.mutate({ id: part.id });
                        }
                      }}>
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
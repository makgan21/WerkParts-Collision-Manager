import { useState } from "react";
import {
  useListTechnicians, useCreateTechnician, useUpdateTechnician, useDeleteTechnician,
  useListInsuranceCompanies, useCreateInsuranceCompany, useUpdateInsuranceCompany, useDeleteInsuranceCompany,
  useListSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier,
  getListTechniciansQueryKey, getListInsuranceCompaniesQueryKey, getListSuppliersQueryKey,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Settings as SettingsIcon, Users, ShieldCheck, Truck, Sun, Moon, Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/lib/theme";

type Tab = "technicians" | "insurance" | "suppliers" | "theme";

// ── Simple name-only list manager ─────────────────────────────────────────────
function NameListSection({
  label,
  rows,
  isLoading,
  onCreate,
  onUpdate,
  onDelete,
  isPendingCreate,
  isPendingUpdate,
}: {
  label: string;
  rows: { id: number; name: string }[] | undefined;
  isLoading: boolean;
  onCreate: (name: string) => void;
  onUpdate: (id: number, name: string) => void;
  onDelete: (id: number, name: string) => void;
  isPendingCreate: boolean;
  isPendingUpdate: boolean;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [editingRow, setEditingRow] = useState<{ id: number; name: string } | null>(null);
  const [editName, setEditName] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) return;
    onCreate(addName.trim());
    setAddName("");
    setIsAdding(false);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow || !editName.trim()) return;
    onUpdate(editingRow.id, editName.trim());
    setEditingRow(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black uppercase tracking-tight">{label}</h2>
        <Button size="sm" className="gap-2" onClick={() => setIsAdding(true)}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={2} className="text-center py-6">Loading...</TableCell></TableRow>
            ) : rows?.length === 0 ? (
              <TableRow><TableCell colSpan={2} className="text-center py-6 text-muted-foreground">None added yet.</TableCell></TableRow>
            ) : rows?.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingRow(row); setEditName(row.name); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(`Delete "${row.name}"?`)) onDelete(row.id, row.name);
                      }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Add dialog */}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add {label.replace(/s$/, '')}</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="addName">Name</Label>
              <Input id="addName" value={addName} onChange={e => setAddName(e.target.value)} required autoFocus />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button type="submit" disabled={isPendingCreate}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingRow} onOpenChange={(open) => !open && setEditingRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit {label.replace(/s$/, '')}</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="editName">Name</Label>
              <Input id="editName" value={editName} onChange={e => setEditName(e.target.value)} required autoFocus />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingRow(null)}>Cancel</Button>
              <Button type="submit" disabled={isPendingUpdate}>Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Suppliers section (richer form) ────────────────────────────────────────────
function SuppliersSection() {
  const [isAdding, setIsAdding] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: suppliers, isLoading } = useListSuppliers();

  const createSupplier = useCreateSupplier({
    mutation: {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); toast.success("Supplier created"); setIsAdding(false); },
      onError: (err: any) => toast.error(err?.error || "Failed"),
    }
  });
  const updateSupplier = useUpdateSupplier({
    mutation: {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); toast.success("Supplier updated"); setEditingSupplier(null); },
      onError: (err: any) => toast.error(err?.error || "Failed"),
    }
  });
  const deleteSupplier = useDeleteSupplier({
    mutation: {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); toast.success("Supplier deleted"); },
      onError: (err: any) => toast.error(err?.error || "Failed"),
    }
  });

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get("name") as string,
      contactName: (fd.get("contactName") as string) || null,
      phone: (fd.get("phone") as string) || null,
      email: (fd.get("email") as string) || null,
      address: (fd.get("address") as string) || null,
    };
    if (editingSupplier) updateSupplier.mutate({ id: editingSupplier.id, data });
    else createSupplier.mutate({ data });
  };

  const SupplierForm = ({ supplier }: { supplier?: any }) => (
    <form onSubmit={handleSave} className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="name">Company Name</Label>
          <Input id="name" name="name" defaultValue={supplier?.name} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactName">Contact Name</Label>
          <Input id="contactName" name="contactName" defaultValue={supplier?.contactName || ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={supplier?.phone || ""} />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={supplier?.email || ""} />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" name="address" defaultValue={supplier?.address || ""} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => { setIsAdding(false); setEditingSupplier(null); }}>Cancel</Button>
        <Button type="submit" disabled={createSupplier.isPending || updateSupplier.isPending}>
          {supplier ? "Save Changes" : "Create Supplier"}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black uppercase tracking-tight">Suppliers</h2>
        <Button size="sm" className="gap-2" onClick={() => setIsAdding(true)}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-6">Loading...</TableCell></TableRow>
            ) : suppliers?.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No suppliers yet.</TableCell></TableRow>
            ) : suppliers?.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-bold">{s.name}</TableCell>
                <TableCell>{s.contactName || "—"}</TableCell>
                <TableCell className="font-mono">{s.phone || "—"}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditingSupplier(s)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => { if (confirm(`Delete "${s.name}"?`)) deleteSupplier.mutate({ id: s.id }); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
          <SupplierForm />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editingSupplier} onOpenChange={(open) => !open && setEditingSupplier(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Supplier: {editingSupplier?.name}</DialogTitle></DialogHeader>
          {editingSupplier && <SupplierForm supplier={editingSupplier} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Settings Page ─────────────────────────────────────────────────────────
export default function Settings() {
  const [tab, setTab] = useState<Tab>("technicians");
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const { data: techs, isLoading: techsLoading } = useListTechnicians();
  const { data: insurers, isLoading: insurersLoading } = useListInsuranceCompanies();

  const createTech = useCreateTechnician({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTechniciansQueryKey() }); toast.success("Technician added"); }, onError: (e: any) => toast.error(e?.error || "Failed") } });
  const updateTech = useUpdateTechnician({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTechniciansQueryKey() }); toast.success("Technician updated"); }, onError: (e: any) => toast.error(e?.error || "Failed") } });
  const deleteTech = useDeleteTechnician({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTechniciansQueryKey() }); toast.success("Technician deleted"); }, onError: (e: any) => toast.error(e?.error || "Failed") } });

  const createInsurer = useCreateInsuranceCompany({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInsuranceCompaniesQueryKey() }); toast.success("Insurance company added"); }, onError: (e: any) => toast.error(e?.error || "Failed") } });
  const updateInsurer = useUpdateInsuranceCompany({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInsuranceCompaniesQueryKey() }); toast.success("Insurance company updated"); }, onError: (e: any) => toast.error(e?.error || "Failed") } });
  const deleteInsurer = useDeleteInsuranceCompany({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInsuranceCompaniesQueryKey() }); toast.success("Insurance company deleted"); }, onError: (e: any) => toast.error(e?.error || "Failed") } });

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "technicians", label: "Technicians", icon: Users },
    { key: "insurance", label: "Insurance", icon: ShieldCheck },
    { key: "suppliers", label: "Suppliers", icon: Truck },
    { key: "theme", label: "Appearance", icon: Sun },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 w-full">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage technicians, insurers, suppliers, and appearance.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "technicians" && (
        <NameListSection
          label="Technicians"
          rows={techs}
          isLoading={techsLoading}
          onCreate={(name) => createTech.mutate({ data: { name } })}
          onUpdate={(id, name) => updateTech.mutate({ id, data: { name } })}
          onDelete={(id) => deleteTech.mutate({ id })}
          isPendingCreate={createTech.isPending}
          isPendingUpdate={updateTech.isPending}
        />
      )}

      {tab === "insurance" && (
        <NameListSection
          label="Insurance Companies"
          rows={insurers}
          isLoading={insurersLoading}
          onCreate={(name) => createInsurer.mutate({ data: { name } })}
          onUpdate={(id, name) => updateInsurer.mutate({ id, data: { name } })}
          onDelete={(id) => deleteInsurer.mutate({ id })}
          isPendingCreate={createInsurer.isPending}
          isPendingUpdate={updateInsurer.isPending}
        />
      )}

      {tab === "suppliers" && <SuppliersSection />}

      {tab === "theme" && (
        <div className="space-y-6">
          <h2 className="text-xl font-black uppercase tracking-tight">Appearance</h2>
          <div className="grid grid-cols-2 gap-4 max-w-sm">
            {[
              { value: "light" as const, label: "Light", icon: Sun, desc: "Bright, high contrast" },
              { value: "dark" as const, label: "Dark", icon: Moon, desc: "Easy on the eyes" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center gap-3 p-6 rounded-sm border-2 transition-all ${
                  theme === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <opt.icon className="w-8 h-8" />
                <div className="text-center">
                  <p className="font-black uppercase tracking-wider text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
                {theme === opt.value && (
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">Active</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

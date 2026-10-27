import { useRef, useState } from "react";
import {
  useListTechnicians, useCreateTechnician, useUpdateTechnician, useDeleteTechnician,
  useListInsuranceCompanies, useCreateInsuranceCompany, useUpdateInsuranceCompany, useDeleteInsuranceCompany,
  useListSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier,
  getListTechniciansQueryKey, getListInsuranceCompaniesQueryKey, getListSuppliersQueryKey,
  useGetShopProfile, useUpdateShopProfile, getGetShopProfileQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Settings as SettingsIcon, Users, ShieldCheck, Truck, Sun, Moon, Plus, Edit2, Trash2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/lib/theme";

type Tab = "technicians" | "insurance" | "suppliers" | "branding" | "theme";

function LogoSection() {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useGetShopProfile();

  const updateProfile = useUpdateShopProfile({
    mutation: {
      onSuccess: async (data) => {
        queryClient.setQueryData(getGetShopProfileQueryKey(), data);
        toast.success(data.logoDataUrl ? "Invoice logo saved" : "Invoice logo removed");
      },
      onError: (error: any) => toast.error(error?.error || "Could not save the invoice logo"),
    },
  });

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Choose an image smaller than 10 MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const loadedImage = new Image();
        loadedImage.onload = () => resolve(loadedImage);
        loadedImage.onerror = () => reject(new Error("This image could not be opened."));
        loadedImage.src = objectUrl;
      });

      let logoDataUrl = "";
      for (const scaleFactor of [1, 0.8, 0.65]) {
        const scale = Math.min(
          1,
          1200 / image.naturalWidth,
          500 / image.naturalHeight,
        ) * scaleFactor;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Could not prepare this image.");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        logoDataUrl = canvas.toDataURL("image/webp", 0.88);
        if (logoDataUrl.length <= 1_400_000) break;
      }

      if (logoDataUrl.length > 1_400_000) {
        throw new Error("This logo is too large. Choose a smaller image.");
      }

      updateProfile.mutate({ data: { logoDataUrl } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read this image.");
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const removeLogo = () => {
    if (!window.confirm("Remove the logo from future invoice prints?")) return;
    updateProfile.mutate({ data: { logoDataUrl: null } });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black uppercase tracking-tight">Invoice Logo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set the logo for this shop. It stays with this installation and appears on printed invoices.
        </p>
      </div>
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="flex min-h-48 items-center justify-center rounded-sm border-2 border-dashed border-border bg-muted/20 p-6">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading shop logo…</p>
            ) : profile?.logoDataUrl ? (
              <img
                src={profile.logoDataUrl}
                alt="Current shop invoice logo"
                className="max-h-40 max-w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                <ImagePlus className="h-8 w-8" />
                <p className="text-sm font-medium">No shop logo set</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFile}
              aria-label="Choose an invoice logo"
            />
            <Button
              type="button"
              className="gap-2"
              onClick={() => inputRef.current?.click()}
              disabled={isLoading || updateProfile.isPending}
            >
              <ImagePlus className="h-4 w-4" />
              {profile?.logoDataUrl ? "Replace Logo" : "Upload Logo"}
            </Button>
            {profile?.logoDataUrl && (
              <Button
                type="button"
                variant="outline"
                onClick={removeLogo}
                disabled={updateProfile.isPending}
              >
                Remove Logo
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            You can upload a shop’s logo yourself before handing over its installation, or the shop can set it here later.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

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
    { key: "branding", label: "Invoice Logo", icon: ImagePlus },
    { key: "theme", label: "Appearance", icon: Sun },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 w-full">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage shop branding, technicians, insurers, suppliers, and appearance.</p>
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

      {tab === "branding" && <LogoSection />}

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

import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateInvoice,
  useListTechnicians,
  useListInsuranceCompanies,
  useCreateInsuranceCompany,
  getListInsuranceCompaniesQueryKey,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => String(CURRENT_YEAR + 1 - i));

const CAR_MAKES = [
  "Acura", "Alfa Romeo", "Aston Martin", "Audi", "Bentley", "BMW", "Buick",
  "Cadillac", "Chevrolet", "Chrysler", "Dodge", "Ferrari", "Fiat", "Ford",
  "Genesis", "GMC", "Honda", "Hyundai", "Infiniti", "Jaguar", "Jeep", "Kia",
  "Lamborghini", "Land Rover", "Lexus", "Lincoln", "Maserati", "Mazda",
  "McLaren", "Mercedes-Benz", "Mini", "Mitsubishi", "Nissan", "Porsche",
  "Ram", "Rolls-Royce", "Subaru", "Tesla", "Toyota", "Volkswagen", "Volvo",
];

const selectClass =
  "flex h-10 w-full rounded-sm border-2 border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-primary";

export default function NewInvoice() {
  const [, setLocation] = useLocation();
  const createInvoice = useCreateInvoice();

  const { data: technicians } = useListTechnicians();
  const { data: insuranceCompanies } = useListInsuranceCompanies();

  const [items, setItems] = useState([
    { id: Date.now(), partNumber: "", description: "", quantity: 1, unitPrice: "" },
  ]);

  const [formData, setFormData] = useState({
    roNumber: "",
    date: new Date().toISOString().split("T")[0],
    techName: "",
    vehicleYear: "",
    vehicleMake: "",
    vehicleModel: "",
    insuranceCompany: "",
    notes: "",
  });

  const handleItemChange = (id: number, field: string, value: string | number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), partNumber: "", description: "", quantity: 1, unitPrice: "" }]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) setItems(items.filter((item) => item.id !== id));
  };

  const calculateSubtotal = () =>
    items.reduce((acc, item) => acc + (parseFloat(String(item.unitPrice)) || 0) * item.quantity, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((i) => i.description.trim() !== "" && i.unitPrice !== "");
    if (validItems.length === 0) {
      toast.error("Please add at least one line item.");
      return;
    }

    const payload = {
      ...formData,
      status: "draft",
      items: validItems.map((i) => ({
        partNumber: i.partNumber || "MISC",
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: String(i.unitPrice),
      })),
    };

    createInvoice.mutate({ data: payload }, {
      onSuccess: (res) => {
        toast.success("Invoice created successfully");
        setLocation(`/invoices/${res.id}`);
      },
      onError: (err: any) => toast.error(err?.error || "Failed to create invoice"),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 max-w-5xl mx-auto space-y-8 w-full pb-32">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">New Invoice</h1>
          <p className="text-muted-foreground">Draft a new repair order invoice.</p>
        </div>
        <Button type="submit" size="lg" disabled={createInvoice.isPending}>
          Save Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Job Details */}
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="roNumber">RO Number</Label>
                <Input
                  id="roNumber"
                  required
                  value={formData.roNumber}
                  onChange={(e) => setFormData({ ...formData, roNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              {/* Technician dropdown */}
              <div className="col-span-2 space-y-2">
                <Label htmlFor="techName">Technician</Label>
                {technicians && technicians.length > 0 ? (
                  <select
                    id="techName"
                    required
                    className={selectClass}
                    value={formData.techName}
                    onChange={(e) => setFormData({ ...formData, techName: e.target.value })}
                  >
                    <option value="">— Select Technician —</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-1">
                    <Input
                      id="techName"
                      required
                      value={formData.techName}
                      onChange={(e) => setFormData({ ...formData, techName: e.target.value })}
                      placeholder="Enter technician name"
                    />
                    <p className="text-xs text-muted-foreground">
                      Add technicians in Settings to get a dropdown here.
                    </p>
                  </div>
                )}
              </div>

              {/* Insurance Company dropdown */}
              <div className="col-span-2 space-y-2">
                <Label htmlFor="insuranceCompany">Insurance Company</Label>
                {insuranceCompanies && insuranceCompanies.length > 0 ? (
                  <select
                    id="insuranceCompany"
                    required
                    className={selectClass}
                    value={formData.insuranceCompany}
                    onChange={(e) => setFormData({ ...formData, insuranceCompany: e.target.value })}
                  >
                    <option value="">— Select Insurance Company —</option>
                    {insuranceCompanies.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-1">
                    <Input
                      id="insuranceCompany"
                      required
                      value={formData.insuranceCompany}
                      onChange={(e) => setFormData({ ...formData, insuranceCompany: e.target.value })}
                      placeholder="Enter insurance company"
                    />
                    <p className="text-xs text-muted-foreground">
                      Add insurers in Settings to get a dropdown here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Details */}
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Year */}
              <div className="space-y-2">
                <Label htmlFor="vehicleYear">Year</Label>
                <select
                  id="vehicleYear"
                  required
                  className={selectClass}
                  value={formData.vehicleYear}
                  onChange={(e) => setFormData({ ...formData, vehicleYear: e.target.value })}
                >
                  <option value="">— Year —</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Make */}
              <div className="space-y-2">
                <Label htmlFor="vehicleMake">Make</Label>
                <select
                  id="vehicleMake"
                  required
                  className={selectClass}
                  value={formData.vehicleMake}
                  onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}
                >
                  <option value="">— Make —</option>
                  {CAR_MAKES.map((make) => (
                    <option key={make} value={make}>{make}</option>
                  ))}
                </select>
              </div>

              {/* Model - free text */}
              <div className="col-span-2 space-y-2">
                <Label htmlFor="vehicleModel">Model</Label>
                <Input
                  id="vehicleModel"
                  required
                  placeholder="e.g. Camry, F-150, Accord..."
                  value={formData.vehicleModel}
                  onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-2">
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        </CardHeader>
        <div className="p-0 border-t border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Part #</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px] text-right">Qty</TableHead>
                <TableHead className="w-[150px] text-right">Unit Price</TableHead>
                <TableHead className="w-[150px] text-right">Total</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const total = (parseFloat(String(item.unitPrice)) || 0) * item.quantity;
                return (
                  <TableRow key={item.id} className="[&_td]:p-2">
                    <TableCell>
                      <Input
                        placeholder="Part #"
                        value={item.partNumber}
                        onChange={(e) => handleItemChange(item.id, "partNumber", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Description"
                        required
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        required
                        className="text-right"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, "quantity", Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        required
                        className="text-right"
                        placeholder="0.00"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(item.id, "unitPrice", e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold align-middle">
                      {formatCurrency(total)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <CardContent className="pt-6 flex flex-col items-end gap-2 bg-muted/20">
          <div className="flex items-center gap-8 text-xl">
            <span className="font-bold uppercase tracking-wider text-muted-foreground text-sm">Invoice Total</span>
            <span className="font-black text-3xl font-mono">{formatCurrency(calculateSubtotal())}</span>
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-primary mt-2">OEM Authorized Price</p>
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes / Remarks</Label>
        <textarea
          id="notes"
          className="flex min-h-[100px] w-full rounded-sm border-2 border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-primary"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>
    </form>
  );
}

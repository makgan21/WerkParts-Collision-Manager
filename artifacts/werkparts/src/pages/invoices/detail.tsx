import { useState } from "react";
import { useRoute } from "wouter";
import {
  useGetInvoice,
  useUpdateInvoice,
  useListTechnicians,
  useListInsuranceCompanies,
  useListParts,
  useListCrossReferences,
  type CrossReference,
  type Part,
} from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, ArrowLeft, CheckCircle, Ban, Plus, Trash2, X } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getGetInvoiceQueryKey } from "@workspace/api-client-react";
import WerkheiserLogo from "@/assets/werkheiser-logo.png";
import { findInvoicePart, getCustomerPrice } from "@/lib/invoice-part-lookup";

const selectClass =
  "flex h-10 w-full rounded-sm border-2 border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-primary";

type DraftItem = {
  id: number;
  partId: number | null;
  partNumber: string;
  description: string;
  quantity: number;
  unitPrice: string;
};

type DraftData = {
  roNumber: string;
  date: string;
  techName: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  insuranceCompany: string;
  notes: string;
};

const getDraftData = (invoice: any): DraftData => ({
  roNumber: invoice.roNumber,
  date: invoice.date,
  techName: invoice.techName,
  vehicleYear: invoice.vehicleYear,
  vehicleMake: invoice.vehicleMake,
  vehicleModel: invoice.vehicleModel,
  insuranceCompany: invoice.insuranceCompany,
  notes: invoice.notes ?? "",
});

const getDraftItems = (
  invoice: any,
  parts: readonly Part[] | undefined,
  crossReferences: readonly CrossReference[] | undefined,
): DraftItem[] =>
  invoice.items.map((item: any) => {
    const matchedPart = parts?.find((part) => part.id === item.partId) ??
      findInvoicePart(item.partNumber, parts, crossReferences);

    return {
      id: item.id,
      partId: item.partId ?? null,
      partNumber: item.partNumber,
      description: item.description,
      quantity: item.quantity,
      unitPrice: matchedPart ? getCustomerPrice(matchedPart) || item.unitPrice : item.unitPrice,
    };
  });

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "finalized") return "default";
  if (status === "voided") return "destructive";
  return "secondary";
}

export default function InvoiceDetail() {
  const [, params] = useRoute("/invoices/:id");
  const id = Number(params?.id);
  const queryClient = useQueryClient();
  const { data: technicians } = useListTechnicians();
  const { data: insuranceCompanies } = useListInsuranceCompanies();
  const { data: parts } = useListParts();
  const { data: crossReferences } = useListCrossReferences();
  const [isEditing, setIsEditing] = useState(false);
  const [draftData, setDraftData] = useState<DraftData | null>(null);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);

  const { data: invoice, isLoading, error } = useGetInvoice(id, {
    query: {
      enabled: !!id,
      queryKey: getGetInvoiceQueryKey(id)
    }
  });

  const updateInvoice = useUpdateInvoice({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(id) });
        setIsEditing(false);
        toast.success("Invoice saved");
      },
      onError: (err: any) => toast.error(err?.error || "Failed to update invoice")
    }
  });

  if (isLoading) return <div className="p-8 font-bold uppercase tracking-wider animate-pulse">Loading invoice...</div>;
  if (error || !invoice) return <div className="p-8 font-bold text-destructive">Invoice not found.</div>;

  const isVoided = invoice.status === "voided";
  const isFinalized = invoice.status === "finalized";

  const startEditing = () => {
    setDraftData(getDraftData(invoice));
    setDraftItems(getDraftItems(invoice, parts, crossReferences));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraftData(getDraftData(invoice));
    setDraftItems(getDraftItems(invoice, parts, crossReferences));
    setIsEditing(false);
  };

  const handleDraftFieldChange = (field: keyof DraftData, value: string) => {
    setDraftData((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleDraftItemChange = (itemId: number, field: keyof DraftItem, value: string | number) => {
    setDraftItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item;

        if (field === "partNumber") {
          const matchedPart = findInvoicePart(String(value), parts, crossReferences);

          if (matchedPart) {
            return {
              ...item,
              partId: matchedPart.id,
              partNumber: String(value),
              description: matchedPart.description,
              unitPrice: getCustomerPrice(matchedPart),
            };
          }

          return {
            ...item,
            partId: null,
            partNumber: String(value),
            description: "",
            unitPrice: "",
          };
        }

        return { ...item, [field]: value };
      }),
    );
  };

  const handleDraftPartNumberBlur = (itemId: number, value: string) => {
    const matchedPart = findInvoicePart(value, parts, crossReferences);
    if (!matchedPart) return;

    setDraftItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              partId: matchedPart.id,
              partNumber: value,
              description: matchedPart.description,
              unitPrice: getCustomerPrice(matchedPart),
            }
          : item,
      ),
    );
  };

  const addDraftItem = () => {
    setDraftItems((current) => [
      ...current,
      {
        id: Date.now(),
        partId: null,
        partNumber: "",
        description: "",
        quantity: 1,
        unitPrice: "",
      },
    ]);
  };

  const removeDraftItem = (itemId: number) => {
    setDraftItems((current) =>
      current.length > 1 ? current.filter((item) => item.id !== itemId) : current,
    );
  };

  const handleSaveDraft = (form?: HTMLFormElement) => {
    if (form && !form.reportValidity()) return;
    if (!draftData) return;
    const validItems = draftItems.filter(
      (item) => item.description.trim() !== "" && item.unitPrice !== "",
    );
    if (validItems.length === 0) {
      toast.error("Please add at least one line item.");
      return;
    }

    updateInvoice.mutate({
      id,
      data: {
        ...draftData,
        notes: draftData.notes || null,
        status: "draft",
        items: validItems.map((item) => ({
          partId: item.partId,
          partNumber: item.partNumber || "MISC",
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: String(item.unitPrice),
        })),
      },
    });
  };

  const handleFinalize = () => {
    if (confirm("Mark this invoice as finalized?")) {
      updateInvoice.mutate({ id, data: { status: "finalized" } });
    }
  };

  const handleVoid = () => {
    if (confirm("Void this invoice? It will remain in the system but be marked as voided.")) {
      updateInvoice.mutate({ id, data: { status: "voided" } });
    }
  };

  if (isEditing && draftData && !isFinalized && !isVoided) {
    const draftTotal = draftItems.reduce(
      (total, item) => total + (parseFloat(item.unitPrice) || 0) * item.quantity,
      0,
    );

    return (
      <form
        onSubmit={(e) => e.preventDefault()}
        className="p-8 max-w-5xl mx-auto space-y-8 w-full pb-32"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Edit Draft</h1>
            <p className="text-muted-foreground">
              Update {invoice.invoiceNumber}. It will remain editable until finalized.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={cancelEditing}>
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button
              type="button"
              onClick={(e) => handleSaveDraft(e.currentTarget.form ?? undefined)}
              disabled={updateInvoice.isPending}
            >
              Save Draft
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Job Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-roNumber">RO Number</Label>
                  <Input
                    id="edit-roNumber"
                    required
                    value={draftData.roNumber}
                    onChange={(e) => handleDraftFieldChange("roNumber", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Date</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    required
                    value={draftData.date}
                    onChange={(e) => handleDraftFieldChange("date", e.target.value)}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit-techName">Technician</Label>
                  {technicians && technicians.length > 0 ? (
                    <select
                      id="edit-techName"
                      required
                      className={selectClass}
                      value={draftData.techName}
                      onChange={(e) => handleDraftFieldChange("techName", e.target.value)}
                    >
                      <option value="">— Select Technician —</option>
                      {technicians.map((technician) => (
                        <option key={technician.id} value={technician.name}>{technician.name}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id="edit-techName"
                      required
                      value={draftData.techName}
                      onChange={(e) => handleDraftFieldChange("techName", e.target.value)}
                    />
                  )}
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit-insuranceCompany">Insurance Company</Label>
                  {insuranceCompanies && insuranceCompanies.length > 0 ? (
                    <select
                      id="edit-insuranceCompany"
                      required
                      className={selectClass}
                      value={draftData.insuranceCompany}
                      onChange={(e) => handleDraftFieldChange("insuranceCompany", e.target.value)}
                    >
                      <option value="">— Select Insurance Company —</option>
                      {insuranceCompanies.map((company) => (
                        <option key={company.id} value={company.name}>{company.name}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id="edit-insuranceCompany"
                      required
                      value={draftData.insuranceCompany}
                      onChange={(e) => handleDraftFieldChange("insuranceCompany", e.target.value)}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Vehicle Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-vehicleYear">Year</Label>
                  <Input
                    id="edit-vehicleYear"
                    required
                    value={draftData.vehicleYear}
                    onChange={(e) => handleDraftFieldChange("vehicleYear", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-vehicleMake">Make</Label>
                  <Input
                    id="edit-vehicleMake"
                    required
                    value={draftData.vehicleMake}
                    onChange={(e) => handleDraftFieldChange("vehicleMake", e.target.value)}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit-vehicleModel">Model</Label>
                  <Input
                    id="edit-vehicleModel"
                    required
                    value={draftData.vehicleModel}
                    onChange={(e) => handleDraftFieldChange("vehicleModel", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addDraftItem} className="gap-2">
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </CardHeader>
          <div className="border-t border-border">
            <datalist id="edit-part-number-options">
              {parts?.map((part) => (
                <option key={part.id} value={part.partNumber}>
                  {part.description}
                </option>
              ))}
              {crossReferences?.map((reference) => (
                <option key={`edit-cross-reference-${reference.id}`} value={reference.referenceNumber} />
              ))}
            </datalist>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {draftItems.map((item) => (
                  <TableRow key={item.id} className="[&_td]:p-2">
                    <TableCell>
                      <Input
                        value={item.partNumber}
                        list="edit-part-number-options"
                        placeholder="Part #"
                        onChange={(e) => handleDraftItemChange(item.id, "partNumber", e.target.value)}
                        onBlur={(e) => handleDraftPartNumberBlur(item.id, e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        required
                        value={item.description}
                        placeholder="Description"
                        onChange={(e) => handleDraftItemChange(item.id, "description", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        required
                        type="number"
                        min="1"
                        className="text-right"
                        value={item.quantity}
                        onChange={(e) => handleDraftItemChange(item.id, "quantity", Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right"
                        value={item.unitPrice}
                        onChange={(e) => handleDraftItemChange(item.id, "unitPrice", e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {formatCurrency((parseFloat(item.unitPrice) || 0) * item.quantity)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeDraftItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <CardContent className="flex justify-end bg-muted/20 pt-6">
            <div className="flex items-center gap-8 text-xl">
              <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Draft Total</span>
              <span className="font-mono text-3xl font-black">{formatCurrency(draftTotal)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Label htmlFor="edit-notes">Notes / Remarks</Label>
          <textarea
            id="edit-notes"
            className="flex min-h-[100px] w-full rounded-sm border-2 border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-primary"
            value={draftData.notes}
            onChange={(e) => handleDraftFieldChange("notes", e.target.value)}
          />
        </div>
      </form>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-8 print:p-0 print:m-0 print:max-w-none">
      {/* Action Bar */}
      <div className="flex items-center justify-between no-print">
        <Link href="/invoices">
          <Button variant="ghost" className="gap-2"><ArrowLeft className="w-4 h-4" /> Back to Invoices</Button>
        </Link>
        <div className="flex items-center gap-3">
          <Badge variant={statusVariant(invoice.status)} className="text-sm px-4 py-1 capitalize">
            {invoice.status}
          </Badge>

          {!isVoided && !isFinalized && (
            <>
              <Button variant="outline" onClick={startEditing} className="gap-2">
                Edit Draft
              </Button>
              <Button variant="outline" onClick={handleFinalize} disabled={updateInvoice.isPending} className="gap-2">
                <CheckCircle className="w-4 h-4" /> Finalize
              </Button>
            </>
          )}

          {!isVoided && !isFinalized && (
            <Button variant="outline" onClick={handleVoid} disabled={updateInvoice.isPending}
              className="gap-2 text-destructive border-destructive/50 hover:bg-destructive/10">
              <Ban className="w-4 h-4" /> Void
            </Button>
          )}

          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="w-4 h-4" /> Print Invoice
          </Button>
        </div>
      </div>

      {/* Voided banner */}
      {isVoided && (
        <div className="no-print bg-destructive/10 border border-destructive/30 rounded-sm px-4 py-3 text-destructive font-bold text-sm uppercase tracking-wider">
          ⚠ This invoice has been voided and is no longer billable.
        </div>
      )}

      {isFinalized && (
        <div className="no-print rounded-sm border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-bold uppercase tracking-wider text-primary">
          This invoice is finalized and locked. It is available for printing only.
        </div>
      )}

      {/* Invoice Document */}
      <div className={`bg-card text-card-foreground p-12 border border-border rounded-md shadow-sm print:border-none print:shadow-none print:p-0 ${isVoided ? "opacity-70" : ""}`}>

        {/* Header */}
        <div className="flex justify-between items-start mb-12 border-b border-border pb-8">
          <div>
            <img 
              src={WerkheiserLogo}
              alt="Werkheiser Collision"
              className="h-auto w-auto"
            />
          </div>
          <div className="text-right space-y-1">
            <h2 className="text-3xl font-black tracking-tight uppercase text-muted-foreground print:text-black">{invoice.invoiceNumber}</h2>
            <p className="font-mono font-bold text-lg">RO: {invoice.roNumber}</p>
            <p className="text-muted-foreground print:text-black">Date: {formatDate(invoice.date)}</p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-8 mb-12">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-black">Vehicle</p>
              <p className="font-bold text-lg">{invoice.vehicleYear} {invoice.vehicleMake} {invoice.vehicleModel}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-black">Technician</p>
              <p className="font-bold">{invoice.techName}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-black">Insurance Company</p>
              <p className="font-bold text-lg">{invoice.insuranceCompany}</p>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="mb-12">
          <Table className="print:border print:border-black">
            <TableHeader className="print:bg-gray-100 print:text-black">
              <TableRow className="print:border-black">
                <TableHead className="w-[150px] print:text-black">Part #</TableHead>
                <TableHead className="print:text-black">Description</TableHead>
                <TableHead className="text-right print:text-black">Qty</TableHead>
                <TableHead className="text-right print:text-black">Unit Price</TableHead>
                <TableHead className="text-right print:text-black">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item) => (
                <TableRow key={item.id} className="print:border-black">
                  <TableCell className="font-mono">{item.partNumber}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right font-mono font-bold">{formatCurrency(item.totalPrice)}</TableCell>
                </TableRow>
              ))}
              {invoice.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground print:text-black">No line items.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer & Totals */}
        <div className="flex justify-between items-end border-t border-border pt-8 print:border-black">
          <div className="max-w-md">
            {invoice.notes && (
              <>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{invoice.notes}</p>
              </>
            )}
            <div className="mt-8">
              <p className="text-lg font-black uppercase tracking-widest text-primary print:text-black">
                OEM Authorized Price
              </p>
            </div>
          </div>
          <div className="text-right space-y-2">
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground print:text-black">Total Amount</p>
            <p className="text-5xl font-black font-mono tracking-tighter">{formatCurrency(invoice.totalAmount)}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
import { useRoute } from "wouter";
import { useGetInvoice, useUpdateInvoice } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, ArrowLeft, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getGetInvoiceQueryKey } from "@workspace/api-client-react";

export default function InvoiceDetail() {
  const [, params] = useRoute("/invoices/:id");
  const id = Number(params?.id);
  const queryClient = useQueryClient();

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
        toast.success("Invoice status updated");
      },
      onError: () => toast.error("Failed to update status")
    }
  });

  if (isLoading) return <div className="p-8 font-bold uppercase tracking-wider animate-pulse">Loading invoice...</div>;
  if (error || !invoice) return <div className="p-8 font-bold text-destructive">Invoice not found.</div>;

  const handlePrint = () => {
    window.print();
  };

  const handleMarkPaid = () => {
    updateInvoice.mutate({ id, data: { status: "paid" } });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-8 print:p-0 print:m-0 print:max-w-none">
      {/* Action Bar - Hidden on print */}
      <div className="flex items-center justify-between no-print">
        <Link href="/invoices">
          <Button variant="ghost" className="gap-2"><ArrowLeft className="w-4 h-4" /> Back to Invoices</Button>
        </Link>
        <div className="flex items-center gap-4">
          <Badge variant={invoice.status as any} className="text-sm px-4 py-1">{invoice.status}</Badge>
          {invoice.status !== 'paid' && (
            <Button variant="outline" onClick={handleMarkPaid} disabled={updateInvoice.isPending} className="gap-2">
              <CheckCircle className="w-4 h-4" /> Mark Paid
            </Button>
          )}
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" /> Print Invoice
          </Button>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="bg-card text-card-foreground p-12 border border-border rounded-md shadow-sm print:border-none print:shadow-none print:p-0">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-12 border-b border-border pb-8">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-primary flex items-center gap-2">
              WerkParts
            </h1>
            <p className="text-muted-foreground font-bold mt-1">Collision Fastener Manager</p>
          </div>
          <div className="text-right space-y-1">
            <h2 className="text-3xl font-black tracking-tight uppercase text-muted-foreground">{invoice.invoiceNumber}</h2>
            <p className="font-mono font-bold text-lg">RO: {invoice.roNumber}</p>
            <p className="text-muted-foreground">Date: {formatDate(invoice.date)}</p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-8 mb-12">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vehicle</p>
              <p className="font-bold text-lg">{invoice.vehicleYear} {invoice.vehicleMake} {invoice.vehicleModel}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Technician</p>
              <p className="font-bold">{invoice.techName}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Insurance Company</p>
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
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No line items.</TableCell>
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
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Total Amount</p>
            <p className="text-5xl font-black font-mono tracking-tighter">{formatCurrency(invoice.totalAmount)}</p>
          </div>
        </div>
        
      </div>
    </div>
  );
}
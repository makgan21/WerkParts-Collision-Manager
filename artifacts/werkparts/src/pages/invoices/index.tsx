import { useState } from "react";
import { useListInvoices } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Plus, Search } from "lucide-react";

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "finalized") return "default";
  if (status === "voided") return "destructive";
  return "secondary";
}

export default function Invoices() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: invoices, isLoading } = useListInvoices({
    search: search || undefined,
    status: statusFilter || undefined,
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">Manage and track repair order invoices.</p>
        </div>
        <Link href="/invoices/new">
          <Button className="gap-2"><Plus className="w-4 h-4" /> New Invoice</Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search RO, Invoice #, Vehicle..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="flex h-10 w-full max-w-[200px] rounded-sm border-2 border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-primary"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="finalized">Finalized</option>
          <option value="voided">Voided</option>
        </select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>RO #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Insurance</TableHead>
              <TableHead>Tech</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8">Loading invoices...</TableCell></TableRow>
            ) : invoices?.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No invoices found.</TableCell></TableRow>
            ) : (
              invoices?.map((inv) => (
                <TableRow key={inv.id} className={inv.status === "voided" ? "opacity-60" : ""}>
                  <TableCell className="font-mono font-bold text-primary">
                    <Link href={`/invoices/${inv.id}`} className="hover:underline">{inv.invoiceNumber}</Link>
                  </TableCell>
                  <TableCell className="font-mono">{inv.roNumber}</TableCell>
                  <TableCell>{formatDate(inv.date)}</TableCell>
                  <TableCell>{inv.vehicleYear} {inv.vehicleMake} {inv.vehicleModel}</TableCell>
                  <TableCell>{inv.insuranceCompany}</TableCell>
                  <TableCell>{inv.techName}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
                  </TableCell>
                  <TableCell className={`text-right font-mono font-bold ${inv.status === "voided" ? "line-through text-muted-foreground" : ""}`}>
                    {formatCurrency(inv.totalAmount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

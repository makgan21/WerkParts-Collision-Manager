import { useGetDashboard } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { ArrowRight, DollarSign, FileText, Layers, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: dashboard, isLoading, error } = useGetDashboard();

  if (isLoading) {
    return <div className="p-8 text-muted-foreground animate-pulse font-bold uppercase tracking-wider">Loading system data...</div>;
  }

  if (error || !dashboard) {
    return <div className="p-8 text-destructive font-bold">Failed to load dashboard data.</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black uppercase tracking-tight">Shop Overview</h1>
        <p className="text-muted-foreground">Quick look at billing and parts movement.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex flex-col items-start gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-sm">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Revenue (This Month)</p>
              <h2 className="text-3xl font-black">{formatCurrency(dashboard.revenueThisMonth)}</h2>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex flex-col items-start gap-4">
            <div className="p-3 bg-secondary text-secondary-foreground rounded-sm">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Total Revenue</p>
              <h2 className="text-3xl font-black">{formatCurrency(dashboard.totalRevenue)}</h2>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col items-start gap-4">
            <div className="p-3 bg-accent/10 text-accent rounded-sm">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Invoices (This Month)</p>
              <h2 className="text-3xl font-black">{dashboard.invoicesThisMonth}</h2>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col items-start gap-4">
            <div className="p-3 bg-muted text-foreground rounded-sm">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Total Invoices</p>
              <h2 className="text-3xl font-black">{dashboard.totalInvoices}</h2>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {/* Recent Invoices */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black uppercase tracking-tight">Recent Invoices</h2>
            <Link href="/invoices">
              <Button variant="ghost" className="gap-2">View All <ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>RO #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.recentInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono font-bold text-primary">
                      <Link href={`/invoices/${inv.id}`} className="hover:underline">{inv.invoiceNumber}</Link>
                    </TableCell>
                    <TableCell>{inv.roNumber}</TableCell>
                    <TableCell>{formatDate(inv.date)}</TableCell>
                    <TableCell>{inv.vehicleYear} {inv.vehicleMake} {inv.vehicleModel}</TableCell>
                    <TableCell>
                      <Badge variant={inv.status as any}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">{formatCurrency(inv.totalAmount)}</TableCell>
                  </TableRow>
                ))}
                {dashboard.recentInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No recent invoices.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
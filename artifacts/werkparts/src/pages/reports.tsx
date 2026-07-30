import { useMemo } from "react";
import { useListInvoices } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart2, Users, TrendingUp } from "lucide-react";

export default function Reports() {
  const { data: invoices, isLoading } = useListInvoices();

  // ── Technician Usage Report ─────────────────────────────────────────────────
  const techReport = useMemo(() => {
    if (!invoices) return [];
    const map = new Map<string, { count: number; revenue: number }>();
    for (const inv of invoices) {
      const tech = inv.techName || "Unknown";
      const existing = map.get(tech) ?? { count: 0, revenue: 0 };
      map.set(tech, {
        count: existing.count + 1,
        revenue: existing.revenue + parseFloat(String(inv.totalAmount) || "0"),
      });
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [invoices]);

  // ── Monthly Revenue Report ──────────────────────────────────────────────────
  const monthlyReport = useMemo(() => {
    if (!invoices) return [];
    const map = new Map<string, { count: number; revenue: number }>();
    for (const inv of invoices) {
      if (!inv.date) continue;
      const [year, month] = inv.date.split("-");
      const key = `${year}-${month}`;
      const existing = map.get(key) ?? { count: 0, revenue: 0 };
      map.set(key, {
        count: existing.count + 1,
        revenue: existing.revenue + parseFloat(String(inv.totalAmount) || "0"),
      });
    }
    return Array.from(map.entries())
      .map(([key, data]) => {
        const [year, month] = key.split("-");
        const label = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
        return { key, label, ...data };
      })
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [invoices]);

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totalRevenue = useMemo(
    () => invoices?.reduce((sum, inv) => sum + parseFloat(String(inv.totalAmount) || "0"), 0) ?? 0,
    [invoices]
  );

  const totalInvoices = invoices?.length ?? 0;

  if (isLoading) {
    return <div className="p-8 font-bold uppercase tracking-wider animate-pulse">Loading reports...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 w-full">
      <div className="flex items-center gap-3">
        <BarChart2 className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Technician usage and revenue breakdowns.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Invoices</p>
            <p className="text-4xl font-black font-mono mt-1">{totalInvoices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Revenue</p>
            <p className="text-4xl font-black font-mono mt-1">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Technician Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Technician Usage
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Technician</TableHead>
              <TableHead className="text-right">Invoices</TableHead>
              <TableHead className="text-right">Total Revenue</TableHead>
              <TableHead className="text-right">Avg per Invoice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {techReport.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No invoice data yet.
                </TableCell>
              </TableRow>
            ) : (
              techReport.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="font-bold">{row.name}</TableCell>
                  <TableCell className="text-right font-mono">{row.count}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-primary">
                    {formatCurrency(row.revenue)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatCurrency(row.count > 0 ? row.revenue / row.count : 0)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Monthly Revenue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Monthly Revenue
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Invoices</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthlyReport.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  No invoice data yet.
                </TableCell>
              </TableRow>
            ) : (
              monthlyReport.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="font-bold">{row.label}</TableCell>
                  <TableCell className="text-right font-mono">{row.count}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-primary">
                    {formatCurrency(row.revenue)}
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

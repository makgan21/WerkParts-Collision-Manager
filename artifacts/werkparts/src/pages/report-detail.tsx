import { ArrowLeft, Printer } from "lucide-react";
import { Link, useRoute } from "wouter";
import { useGetReports } from "@workspace/api-client-react";
import type { Reports } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { REPORT_DEFINITIONS, type ReportId } from "@/lib/report-definitions";

function NoRows({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center text-muted-foreground">
        No invoice data yet.
      </TableCell>
    </TableRow>
  );
}

function TechnicianUsageTable({ reports }: { reports: Reports }) {
  return (
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
        {reports.technicianUsage.length === 0 ? <NoRows colSpan={4} /> : reports.technicianUsage.map((row) => (
          <TableRow key={row.name}>
            <TableCell className="font-bold">{row.name}</TableCell>
            <TableCell className="text-right font-mono">{row.invoiceCount}</TableCell>
            <TableCell className="text-right font-mono font-bold">{formatCurrency(row.totalRevenue)}</TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(row.invoiceCount ? Number(row.totalRevenue) / row.invoiceCount : 0)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function RevenueTable({
  rows,
  emptyLabel,
}: {
  rows: Reports["monthlyRevenue"];
  emptyLabel: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{emptyLabel}</TableHead>
          <TableHead className="text-right">Invoices</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? <NoRows colSpan={3} /> : rows.map((row) => (
          <TableRow key={row.period}>
            <TableCell className="font-bold">{row.label}</TableCell>
            <TableCell className="text-right font-mono">{row.invoiceCount}</TableCell>
            <TableCell className="text-right font-mono font-bold">{formatCurrency(row.totalRevenue)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function InsuranceUsageTable({ reports }: { reports: Reports }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Insurance Company</TableHead>
          <TableHead className="text-right">Invoices</TableHead>
          <TableHead className="text-right">Total Revenue</TableHead>
          <TableHead className="text-right">Avg per Invoice</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.insuranceUsage.length === 0 ? <NoRows colSpan={4} /> : reports.insuranceUsage.map((row) => (
          <TableRow key={row.name}>
            <TableCell className="font-bold">{row.name}</TableCell>
            <TableCell className="text-right font-mono">{row.invoiceCount}</TableCell>
            <TableCell className="text-right font-mono font-bold">{formatCurrency(row.totalRevenue)}</TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(row.invoiceCount ? Number(row.totalRevenue) / row.invoiceCount : 0)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ClipUsageTable({ reports }: { reports: Reports }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Rank</TableHead>
          <TableHead>Part Number</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Qty Used</TableHead>
          <TableHead className="text-right">Invoices</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.clipUsage.length === 0 ? <NoRows colSpan={6} /> : reports.clipUsage.map((row, index) => (
          <TableRow key={`${row.partNumber}-${row.description}`}>
            <TableCell className="font-mono">{index + 1}</TableCell>
            <TableCell className="font-mono font-bold">{row.partNumber}</TableCell>
            <TableCell>{row.description}</TableCell>
            <TableCell className="text-right font-mono font-bold">{row.quantity}</TableCell>
            <TableCell className="text-right font-mono">{row.invoiceCount}</TableCell>
            <TableCell className="text-right font-mono">{formatCurrency(row.totalRevenue)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function ReportDetail() {
  const [, params] = useRoute("/reports/:reportId");
  const reportId = params?.reportId;
  const report = REPORT_DEFINITIONS.find((definition) => definition.id === reportId);
  const { data: reports, isLoading, isError } = useGetReports();

  if (!report || !REPORT_DEFINITIONS.some((definition) => definition.id === reportId)) {
    return (
      <div className="p-8 max-w-5xl mx-auto w-full">
        <Card><CardContent className="py-12 text-center">Report not found.</CardContent></Card>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8 font-bold uppercase tracking-wider animate-pulse">Loading report...</div>;
  }

  if (isError || !reports) {
    return (
      <div className="p-8 max-w-5xl mx-auto w-full space-y-5">
        <Link href="/reports" className="no-print inline-flex items-center gap-2 text-sm font-bold uppercase text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to reports
        </Link>
        <Card><CardContent className="py-12 text-center">Unable to load this report. Refresh and try again.</CardContent></Card>
      </div>
    );
  }

  const renderReport = (id: ReportId) => {
    switch (id) {
      case "technician-usage":
        return <TechnicianUsageTable reports={reports} />;
      case "monthly-revenue":
        return <RevenueTable rows={reports.monthlyRevenue} emptyLabel="Month" />;
      case "yearly-revenue":
        return <RevenueTable rows={reports.yearlyRevenue} emptyLabel="Year" />;
      case "insurance-usage":
        return <InsuranceUsageTable reports={reports} />;
      case "clip-usage":
        return <ClipUsageTable reports={reports} />;
    }
  };

  return (
    <div className="report-print-area print-container mx-auto w-full max-w-6xl space-y-6 p-8">
      <div className="no-print flex items-center justify-between gap-4">
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> All Reports
        </Link>
        <Button type="button" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" /> Print Report
        </Button>
      </div>

      <header className="border-b-2 border-primary pb-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">WerkParts Report</p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">{report.title}</h1>
        <p className="mt-2 text-muted-foreground">{report.description}</p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Card className="report-card">
          <CardContent className="pt-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Invoices</p>
            <p className="mt-1 font-mono text-2xl font-black">{reports.totalInvoices}</p>
          </CardContent>
        </Card>
        <Card className="report-card">
          <CardContent className="pt-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Revenue</p>
            <p className="mt-1 font-mono text-2xl font-black">{formatCurrency(reports.totalRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="report-card overflow-hidden">
        {renderReport(report.id)}
      </Card>

      <p className="hidden print:block pt-4 text-xs text-gray-500">
        Generated {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}
      </p>
    </div>
  );
}

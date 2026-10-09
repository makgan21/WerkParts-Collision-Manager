import { useGetReports } from "@workspace/api-client-react";
import {
  ArrowUpRight,
  BarChart2,
  Building2,
  CalendarDays,
  CircleDollarSign,
  PackageSearch,
  Users,
} from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { REPORT_DEFINITIONS, type ReportId } from "@/lib/report-definitions";

const reportIcons = {
  "technician-usage": Users,
  "monthly-revenue": CalendarDays,
  "yearly-revenue": CircleDollarSign,
  "insurance-usage": Building2,
  "clip-usage": PackageSearch,
} satisfies Record<ReportId, typeof Users>;

export default function Reports() {
  const { data: reports, isLoading, isError } = useGetReports();

  if (isLoading) {
    return <div className="p-8 font-bold uppercase tracking-wider animate-pulse">Loading reports...</div>;
  }

  if (isError || !reports) {
    return (
      <div className="p-8 max-w-6xl mx-auto w-full">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-bold uppercase tracking-wider">Reports are unavailable</p>
            <p className="text-muted-foreground mt-2">Refresh the page and try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 w-full">
      <div className="flex items-center gap-3">
        <BarChart2 className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Choose a report to view, then print it when you’re ready.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Invoices</p>
            <p className="text-4xl font-black font-mono mt-1">{reports.totalInvoices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Revenue</p>
            <p className="text-4xl font-black font-mono mt-1">{formatCurrency(reports.totalRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="report-menu-heading">
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h2 id="report-menu-heading" className="text-xl font-black uppercase tracking-tight">
              Report Menu
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select a report to open its detailed view.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {REPORT_DEFINITIONS.map((report) => {
            const Icon = reportIcons[report.id];
            return (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                className="group text-left rounded-md border-2 border-card-border bg-card p-6 transition-all hover:border-primary hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
                <h3 className="mt-6 text-lg font-black uppercase tracking-tight">{report.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{report.description}</p>
                <p className="mt-5 text-xs font-bold uppercase tracking-widest text-primary">Open report</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
export const REPORT_DEFINITIONS = [
  {
    id: "technician-usage",
    title: "Technician Usage",
    description: "Invoices, revenue, and average invoice value by technician.",
  },
  {
    id: "monthly-revenue",
    title: "Monthly Revenue",
    description: "Revenue and invoice volume grouped by month.",
  },
  {
    id: "yearly-revenue",
    title: "Yearly Revenue",
    description: "Year-over-year revenue and invoice totals.",
  },
  {
    id: "insurance-usage",
    title: "Insurance Company Usage",
    description: "Invoice volume and revenue by insurance company.",
  },
  {
    id: "clip-usage",
    title: "Clip Usage",
    description: "Most-used clips ranked by quantity across invoices.",
  },
] as const;

export type ReportId = (typeof REPORT_DEFINITIONS)[number]["id"];
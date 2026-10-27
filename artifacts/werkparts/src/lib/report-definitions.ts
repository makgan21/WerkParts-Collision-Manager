export const REPORT_DEFINITIONS = [
  {
    id: "technician-usage",
    title: "Technician Usage",
    description: "Invoices, gross profit, and average gross profit by technician.",
  },
  {
    id: "monthly-revenue",
    title: "Monthly Gross Profit",
    description: "Gross profit and invoice volume grouped by month.",
  },
  {
    id: "yearly-revenue",
    title: "Yearly Gross Profit",
    description: "Year-over-year gross profit and invoice totals.",
  },
  {
    id: "insurance-usage",
    title: "Insurance Company Usage",
    description: "Invoice volume and gross profit by insurance company.",
  },
  {
    id: "clip-usage",
    title: "Clip Usage",
    description: "Clips, retainers, rivets, grommets, and pins ranked by quantity used.",
  },
] as const;

export type ReportId = (typeof REPORT_DEFINITIONS)[number]["id"];
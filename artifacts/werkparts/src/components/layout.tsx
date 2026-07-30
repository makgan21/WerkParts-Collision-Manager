import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, Wrench, Settings, BarChart2 } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const mainLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/invoices", label: "Invoices", icon: FileText },
    { href: "/parts", label: "Parts", icon: Wrench },
    { href: "/reports", label: "Reports", icon: BarChart2 },
  ];

  const isActive = (href: string) =>
    href === "/invoices"
      ? location === "/invoices" || (location.startsWith("/invoices/") && location !== "/invoices/new")
      : location === href || (href !== "/" && location.startsWith(href));

  return (
    <div className="min-h-[100dvh] flex bg-background">
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex-shrink-0 no-print flex flex-col border-r border-sidebar-border">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border/50">
          <div className="flex items-center gap-2 font-black text-xl tracking-tight uppercase">
            <Wrench className="w-5 h-5 text-primary" />
            <span>WerkParts</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {mainLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors text-sm font-bold uppercase tracking-wider ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4 border-t border-sidebar-border/50 pt-3">
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors text-sm font-bold uppercase tracking-wider ${
              location.startsWith("/settings")
                ? "bg-primary text-primary-foreground"
                : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/60"
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col print-container overflow-x-hidden min-w-0">
        {children}
      </main>
    </div>
  );
}

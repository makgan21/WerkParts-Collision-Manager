import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, Wrench, Truck } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/invoices", label: "Invoices", icon: FileText },
    { href: "/parts", label: "Parts", icon: Wrench },
    { href: "/suppliers", label: "Suppliers", icon: Truck },
  ];

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
          {links.map((link) => {
            const isActive = location === link.href || (link.href !== "/" && location.startsWith(link.href));
            return (
              <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors text-sm font-bold uppercase tracking-wider ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}>
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col print-container overflow-x-hidden min-w-0">
        {children}
      </main>
    </div>
  );
}

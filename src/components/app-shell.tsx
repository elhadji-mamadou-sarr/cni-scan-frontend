import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  ScanLine,
  ShieldCheck,
  Settings,
  LogOut,
  Search,
  Bell,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: (path: string) => boolean;
};

const NAV: NavItem[] = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard, match: (p) => p === "/" },
  {
    to: "/upload",
    label: "Nouvelle numérisation",
    icon: ScanLine,
    match: (p) => p.startsWith("/upload") || p.startsWith("/processing") || p.startsWith("/verify"),
  },
  {
    to: "/",
    label: "Enregistrements",
    icon: ShieldCheck,
    match: (p) => p.startsWith("/records"),
  },
];

export function AppShell({
  children,
  title,
  breadcrumb,
  actions,
}: {
  children: ReactNode;
  title?: string;
  breadcrumb?: string;
  actions?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
          <div className="flex h-16 items-center gap-2.5 px-5 border-b border-sidebar-border/60">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">CNI Scan</div>
              <div className="text-[11px] text-sidebar-foreground/60">République du Sénégal</div>
            </div>
          </div>

          <nav className="flex-1 space-y-0.5 p-3">
            <div className="px-2 pt-2 pb-1 text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/40">
              Espace opérateur
            </div>
            {NAV.map((item) => {
              const active = item.match ? item.match(pathname) : pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-sidebar-border/60 p-3 space-y-0.5">
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent/60">
              <Settings className="h-4 w-4" /> Paramètres
            </button>
            <Link
              to="/login"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent/60"
            >
              <LogOut className="h-4 w-4" /> Déconnexion
            </Link>
            <div className="mt-3 flex items-center gap-3 rounded-md bg-sidebar-accent/40 px-3 py-2.5">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-[11px]">
                  AD
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-xs font-medium">Aïcha Diop</div>
                <div className="truncate text-[11px] text-sidebar-foreground/60">
                  Opérateur — DGE Dakar
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-surface/95 px-6 backdrop-blur">
            <div className="min-w-0 flex-1">
              {breadcrumb && (
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {breadcrumb}
                </div>
              )}
              {title && (
                <h1 className="truncate text-[15px] font-semibold text-foreground">{title}</h1>
              )}
            </div>
            <div className="relative hidden md:block w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un numéro, un nom…"
                className="h-10 pl-9 bg-surface-muted border-border"
              />
            </div>
            <Button variant="ghost" size="icon" aria-label="Aide" className="h-10 w-10">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Notifications" className="h-10 w-10 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-warning" />
            </Button>
            {actions}
          </header>

          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}

import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CreditCard,
  BellRing,
  ShieldCheck,
  Search,
  Command,
  LogOut,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: CreditCard },
  { to: "/alerts", label: "Alerts", icon: BellRing },
] as const;

export function AppLayout({ children, title }: { children: ReactNode; title: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate({ to: "/login" });
  };

  // Initials for avatar
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "FA";

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-surface">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand to-chart-5 flex items-center justify-center shadow-soft">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Sentinel</div>
            <div className="text-[11px] text-muted-foreground -mt-0.5">Fraud Intelligence</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                  active
                    ? "bg-secondary text-foreground font-medium shadow-card"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-brand")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 m-3 rounded-xl border border-border bg-surface-2">
          <div className="text-xs font-medium">Live monitoring</div>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-risk-low opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-risk-low" />
            </span>
            Streaming since 09:14
          </div>
        </div>
        {/* User + logout */}
        <div className="flex items-center gap-3 px-4 py-3 border-t border-border">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand to-chart-5 text-white text-xs font-semibold flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{user?.name ?? "Analyst"}</div>
            <div className="text-[11px] text-muted-foreground truncate">{user?.email ?? ""}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="text-muted-foreground hover:text-foreground transition p-1 rounded"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border glass sticky top-0 z-20 px-6 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold tracking-tight">{title}</h1>
            <p className="text-xs text-muted-foreground">
              Real-time fraud signals across your payment stack
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-muted-foreground w-72">
              <Search className="h-3.5 w-3.5" />
              <span className="flex-1">Search transactions, users, IPs…</span>
              <kbd className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono inline-flex items-center gap-1">
                <Command className="h-3 w-3" /> K
              </kbd>
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand to-chart-5 text-white text-xs font-semibold flex items-center justify-center">
              {initials}
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

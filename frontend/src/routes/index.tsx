import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertOctagon, BellRing, Gauge } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/StatCard";
import { TrendChart } from "@/components/charts/TrendChart";
import { CountryBarChart } from "@/components/charts/CountryBarChart";
import { api } from "@/lib/api";
import { fmtNumber, fmtRelative, riskBgClass } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Sentinel Fraud" },
      { name: "description", content: "Premium fraud analyst dashboard with real-time signals." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const summary = useQuery({ queryKey: ["summary"], queryFn: api.summary, retry: 2 });
  const trends = useQuery({ queryKey: ["trends"], queryFn: api.trends, retry: 2 });
  const countries = useQuery({ queryKey: ["countries"], queryFn: api.countries, retry: 2 });
  const txs = useQuery({ queryKey: ["transactions"], queryFn: api.transactions, refetchInterval: 5000, retry: 2 });

  const s = summary.data;
  const recentHigh = (txs.data ?? []).filter((t) => t.riskLevel === "HIGH").slice(0, 5);

  return (
    <AppLayout title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Transactions"
          value={s ? fmtNumber(s.totalTransactions) : "—"}
          delta={s?.deltaTransactions ?? 0}
          icon={Activity}
          tint="brand"
        />
        <StatCard
          label="HIGH Risk Count"
          value={s ? fmtNumber(s.highRiskCount) : "—"}
          delta={s?.deltaHighRisk ?? 0}
          icon={AlertOctagon}
          tint="risk-high"
          invertDelta
        />
        <StatCard
          label="Avg Risk Score"
          value={s ? `${s.avgRiskScore}` : "—"}
          delta={s?.deltaAvgRisk ?? 0}
          icon={Gauge}
          tint="risk-medium"
          invertDelta
        />
        <StatCard
          label="Total Alerts"
          value={s ? fmtNumber(s.totalAlerts) : "—"}
          delta={s?.deltaAlerts ?? 0}
          icon={BellRing}
          tint="risk-low"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-surface p-5 shadow-card">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold">Fraud signals per day</h2>
              <p className="text-xs text-muted-foreground">Rolling 30-day window</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-brand" />
              Fraud events
            </div>
          </div>
          {trends.data && <TrendChart data={trends.data} />}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
          <div className="mb-4">
            <h2 className="text-sm font-semibold">Fraud by country</h2>
            <p className="text-xs text-muted-foreground">Top originating regions</p>
          </div>
          {countries.data && <CountryBarChart data={countries.data} />}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface shadow-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">Latest high-risk activity</h2>
            <p className="text-xs text-muted-foreground">Auto-refreshing every 5 seconds</p>
          </div>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-risk-low animate-pulse" /> Live
          </span>
        </div>
        <ul className="divide-y divide-border">
          {recentHigh.map((t) => (
            <li key={t.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className={cn("h-9 w-9 rounded-lg pulse-high flex items-center justify-center", riskBgClass(t.riskLevel))}>
                <AlertOctagon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {t.merchant} · <span className="font-mono">${t.amount.toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted-foreground font-mono truncate">{t.id} · {t.country}</div>
              </div>
              <div className="text-xs text-muted-foreground">{fmtRelative(t.timestamp)}</div>
            </li>
          ))}
          {recentHigh.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">No high-risk activity right now.</li>
          )}
        </ul>
      </div>
    </AppLayout>
  );
}

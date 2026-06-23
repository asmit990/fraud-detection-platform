import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertOctagon, ShieldCheck, Eye } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { api } from "@/lib/api";
import { fmtRelative, riskBgClass } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts · Sentinel" },
      { name: "description", content: "High-risk incident feed for fraud analysts." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  return (
    <ProtectedRoute>
      <AlertsContent />
    </ProtectedRoute>
  );
}

function AlertsContent() {
  const { data = [] } = useQuery({ queryKey: ["alerts"], queryFn: api.alerts, refetchInterval: 8000, retry: 2 });

  return (
    <AppLayout title="Alerts">
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Stat label="Open incidents" value={data.filter((a) => a.status === "open").length} accent="risk-high" />
        <Stat label="Investigating" value={data.filter((a) => a.status === "investigating").length} accent="risk-medium" />
        <Stat label="Dismissed (24h)" value={data.filter((a) => a.status === "dismissed").length} accent="risk-low" />
      </div>

      <div className="rounded-2xl border border-border bg-surface shadow-card">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">High-risk incident feed</h2>
            <p className="text-xs text-muted-foreground">Triage in chronological order</p>
          </div>
        </div>
        <ol className="relative">
          {data.map((a, i) => (
            <li key={a.id} className="relative pl-12 pr-5 py-5 border-b border-border last:border-0 hover:bg-secondary/40 transition">
              <span className="absolute left-5 top-6 h-3 w-3 rounded-full bg-risk-high ring-4 ring-risk-high/15" />
              {i < data.length - 1 && (
                <span className="absolute left-[26px] top-9 bottom-0 w-px bg-border" />
              )}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-md font-semibold", riskBgClass(a.severity))}>
                      <AlertOctagon className="h-3 w-3" /> {a.severity}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">{a.id}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{fmtRelative(a.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-snug">{a.reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Linked transaction <span className="font-mono">{a.transactionId}</span>
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" className="gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> Investigate
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> Dismiss
                  </Button>
                </div>
              </div>
            </li>
          ))}
          {data.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted-foreground">
              No alerts in the feed.
            </li>
          )}
        </ol>
      </div>
    </AppLayout>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: "risk-high" | "risk-medium" | "risk-low" }) {
  const tints = {
    "risk-high": "from-risk-high/15 to-risk-high/0 text-risk-high",
    "risk-medium": "from-risk-medium/15 to-risk-medium/0 text-risk-medium",
    "risk-low": "from-risk-low/15 to-risk-low/0 text-risk-low",
  } as const;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className={cn("absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl opacity-60", tints[accent])} />
      <div className="text-xs text-muted-foreground font-medium">{label}</div>
      <div className="mt-2 text-3xl font-semibold font-mono tracking-tight">{value}</div>
    </div>
  );
}

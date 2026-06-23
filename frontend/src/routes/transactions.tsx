import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { api, type Transaction } from "@/lib/api";
import {
  fmtDate,
  fmtMoney,
  riskBarClass,
  riskBgClass,
  statusClass,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { TransactionDrawer } from "@/components/TransactionDrawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions · Sentinel" },
      { name: "description", content: "Inspect, filter and drill into every transaction." },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  return (
    <ProtectedRoute>
      <TransactionsContent />
    </ProtectedRoute>
  );
}

function TransactionsContent() {
  const { data = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: api.transactions,
    refetchInterval: 4000,
    retry: 2,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [risk, setRisk] = useState<string>("all");
  const [selected, setSelected] = useState<Transaction | null>(null);

  // Track newly inserted rows for entrance animation
  const seenIds = useRef<Set<string>>(new Set());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const incoming = new Set<string>();
    for (const t of data) {
      if (!seenIds.current.has(t.id)) {
        incoming.add(t.id);
        seenIds.current.add(t.id);
      }
    }
    if (incoming.size && seenIds.current.size > incoming.size) {
      setNewIds(incoming);
      const id = setTimeout(() => setNewIds(new Set()), 1200);
      return () => clearTimeout(id);
    }
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((t) => {
      if (status !== "all" && t.status !== status) return false;
      if (risk !== "all" && t.riskLevel !== risk) return false;
      if (q && !`${t.id} ${t.userId} ${t.country} ${t.merchant ?? ""}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [data, search, status, risk]);

  return (
    <AppLayout title="Transactions">
      <div className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-border bg-surface-2">
          <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg border border-border bg-surface focus-within:ring-2 focus-within:ring-brand/30 transition">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by transaction ID, user, country, merchant…"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
          <Select value={risk} onValueChange={setRisk}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border bg-surface-2/50">
                <Th>Transaction</Th>
                <Th>User</Th>
                <Th className="text-right">Amount</Th>
                <Th>Country</Th>
                <Th className="w-[200px]">Risk Score</Th>
                <Th>Status</Th>
                <Th className="text-right pr-5">Time</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className={cn(
                    "border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-secondary/50",
                    newIds.has(t.id) && "row-enter",
                  )}
                >
                  <Td>
                    <span className="font-mono text-xs">{t.id}</span>
                    {t.merchant && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">{t.merchant}</div>
                    )}
                  </Td>
                  <Td>
                    <span className="font-mono text-xs text-muted-foreground">{t.userId}</span>
                  </Td>
                  <Td className="text-right">
                    <span className="font-mono">{fmtMoney(t.amount, t.currency)}</span>
                  </Td>
                  <Td>{t.country}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", riskBarClass(t.riskLevel))}
                          style={{ width: `${t.riskScore}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs w-7 text-right">{t.riskScore}</span>
                    </div>
                  </Td>
                  <Td>
                    <span className={cn("inline-flex px-2 py-0.5 text-[11px] rounded-full font-medium capitalize", statusClass(t.status))}>
                      {t.status}
                    </span>
                  </Td>
                  <Td className="text-right pr-5 text-xs text-muted-foreground">{fmtDate(t.timestamp)}</Td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    No transactions match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-surface-2/50">
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filtered.length}</span> of {data.length}
          </div>
          <button className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground">
            Load more <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      <TransactionDrawer tx={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </AppLayout>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("font-medium px-5 py-3", className)}>{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-5 py-3.5 align-middle", className)}>{children}</td>;
}

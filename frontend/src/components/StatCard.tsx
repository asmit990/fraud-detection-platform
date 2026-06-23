import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  tint = "brand",
  invertDelta = false,
}: {
  label: string;
  value: string;
  delta: number;
  icon: LucideIcon;
  tint?: "brand" | "risk-high" | "risk-medium" | "risk-low";
  invertDelta?: boolean;
}) {
  const positive = invertDelta ? delta < 0 : delta > 0;
  const tints: Record<string, string> = {
    brand: "from-brand/10 to-brand/0 text-brand",
    "risk-high": "from-risk-high/15 to-risk-high/0 text-risk-high",
    "risk-medium": "from-risk-medium/15 to-risk-medium/0 text-risk-medium",
    "risk-low": "from-risk-low/15 to-risk-low/0 text-risk-low",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-card hover:shadow-soft transition-shadow">
      <div className={cn("absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl opacity-60", tints[tint])} />
      <div className="flex items-start justify-between relative">
        <div>
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight font-mono">{value}</div>
        </div>
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br", tints[tint])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-medium",
            positive ? "text-risk-low bg-risk-low/10" : "text-risk-high bg-risk-high/10",
          )}
        >
          {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(delta).toFixed(1)}%
        </span>
        <span className="text-muted-foreground">vs. last 7 days</span>
      </div>
    </div>
  );
}

import type { RiskLevel } from "./api";

export const fmtMoney = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);

export const fmtNumber = (n: number) => new Intl.NumberFormat("en-US").format(n);

export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const fmtRelative = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export const riskTextClass = (l: RiskLevel) =>
  l === "HIGH" ? "text-risk-high" : l === "MEDIUM" ? "text-risk-medium" : "text-risk-low";

export const riskBgClass = (l: RiskLevel) =>
  l === "HIGH"
    ? "bg-risk-high/10 text-risk-high ring-1 ring-risk-high/20"
    : l === "MEDIUM"
      ? "bg-risk-medium/10 text-risk-medium ring-1 ring-risk-medium/20"
      : "bg-risk-low/10 text-risk-low ring-1 ring-risk-low/20";

export const riskBarClass = (l: RiskLevel) =>
  l === "HIGH" ? "bg-risk-high" : l === "MEDIUM" ? "bg-risk-medium" : "bg-risk-low";

export const statusClass = (s: string) => {
  switch (s) {
    case "approved":
      return "bg-risk-low/10 text-risk-low ring-1 ring-risk-low/20";
    case "review":
      return "bg-risk-medium/10 text-risk-medium ring-1 ring-risk-medium/20";
    case "flagged":
      return "bg-orange-500/10 text-orange-600 ring-1 ring-orange-500/20";
    case "blocked":
      return "bg-risk-high/10 text-risk-high ring-1 ring-risk-high/20";
    case "pending":
      return "bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20";
    default:
      return "bg-muted text-muted-foreground ring-1 ring-border";
  }
};

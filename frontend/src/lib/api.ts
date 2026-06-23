// API client for the fraud detection backends.
// Connects directly to the transaction-service (port 3001)
// and analytics-service (port 3003).
// All /api/* calls attach the JWT from the auth store.

import { getStoredToken } from "@/store/authStore";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  country: string;
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
  status: "approved" | "flagged" | "blocked" | "review" | "pending";
  timestamp: string; // ISO
  merchant?: string;
  paymentMethod?: string;
  ipAddress?: string;
  device?: string;
}

export interface Alert {
  id: string;
  transactionId: string;
  severity: RiskLevel;
  reason: string;
  createdAt: string;
  status: "open" | "investigating" | "dismissed";
}

export interface AnalyticsSummary {
  totalTransactions: number;
  highRiskCount: number;
  avgRiskScore: number;
  totalAlerts: number;
  deltaTransactions: number;
  deltaHighRisk: number;
  deltaAvgRisk: number;
  deltaAlerts: number;
}

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  fraud: number;
  total: number;
}

export interface CountryStat {
  country: string;
  code: string;
  count: number;
}

const TX_API = "http://localhost:3001";
const ANALYTICS_API = "http://localhost:3003";

// ---- Helpers ----

/** Authenticated fetch — attaches Bearer token if present */
async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

/** Map fraud_status from DB to the UI's "status" concept */
function mapFraudStatus(
  fraudStatus: string,
  riskScore: number,
): Transaction["status"] {
  const s = (fraudStatus ?? "PENDING").toUpperCase();
  if (s === "FRAUD" || s === "HIGH") return "blocked";
  if (s === "MEDIUM") return "flagged";
  if (s === "LOW" || s === "LEGIT") return "approved";
  if (s === "PENDING") {
    if (riskScore >= 75) return "review";
    return "pending";
  }
  return "pending";
}

/** Derive risk level from numeric score */
function riskLevelFor(score: number): RiskLevel {
  if (score >= 75) return "HIGH";
  if (score >= 45) return "MEDIUM";
  return "LOW";
}

/** ISO-3166 country name → code mapping (common subset) */
const COUNTRY_CODES: Record<string, string> = {
  "united states": "US",
  usa: "US",
  us: "US",
  "united kingdom": "GB",
  uk: "GB",
  gb: "GB",
  germany: "DE",
  de: "DE",
  brazil: "BR",
  br: "BR",
  india: "IN",
  in: "IN",
  nigeria: "NG",
  ng: "NG",
  japan: "JP",
  jp: "JP",
  france: "FR",
  fr: "FR",
  china: "CN",
  cn: "CN",
  russia: "RU",
  ru: "RU",
  canada: "CA",
  ca: "CA",
  australia: "AU",
  au: "AU",
  mexico: "MX",
  mx: "MX",
  italy: "IT",
  it: "IT",
  spain: "ES",
  es: "ES",
  "south korea": "KR",
  kr: "KR",
  indonesia: "ID",
  turkey: "TR",
  netherlands: "NL",
  singapore: "SG",
  "south africa": "ZA",
  uae: "AE",
  "united arab emirates": "AE",
  pakistan: "PK",
  bangladesh: "BD",
};

function countryToCode(name: string): string {
  return COUNTRY_CODES[name.toLowerCase()] ?? name.slice(0, 2).toUpperCase();
}

// ---- Transform backend rows to frontend types ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformTransaction(row: any): Transaction {
  const riskScore = Math.round(Number(row.risk_score ?? 0));
  return {
    id: row.id,
    userId: row.user_id,
    amount: Number(row.amount),
    currency: row.currency ?? "INR",
    country: row.country,
    riskScore,
    riskLevel: riskLevelFor(riskScore),
    status: mapFraudStatus(row.fraud_status, riskScore),
    timestamp: row.timestamp ?? row.created_at,
    device: row.device_id ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformAlert(row: any): Alert {
  const severity = (row.severity ?? "MEDIUM").toUpperCase();
  return {
    id: row.id,
    transactionId: row.transaction_id,
    severity:
      severity === "HIGH" || severity === "CRITICAL"
        ? "HIGH"
        : severity === "MEDIUM"
          ? "MEDIUM"
          : "LOW",
    reason: row.message ?? row.reason ?? "Fraud signal detected",
    createdAt: row.created_at,
    status: "open", // DB doesn't track alert status yet
  };
}

// ---- Public API ----
export const api = {
  /** GET /api/transactions → Transaction[] */
  transactions: async (): Promise<Transaction[]> => {
    const res = await apiFetch(`${TX_API}/api/transactions?limit=100`);
    if (!res.ok) throw new Error(`transactions: ${res.status}`);
    const json = await res.json();
    // Backend wraps in { transactions: [...], count }
    const rows = json.transactions ?? json;
    return (Array.isArray(rows) ? rows : []).map(transformTransaction);
  },

  /** GET /api/transactions/:id → Transaction */
  transaction: async (id: string): Promise<Transaction> => {
    const res = await apiFetch(`${TX_API}/api/transactions/${id}`);
    if (!res.ok) throw new Error(`transaction ${id}: ${res.status}`);
    const json = await res.json();
    // Backend wraps in { transaction: {...}, alerts: [...] }
    return transformTransaction(json.transaction ?? json);
  },

  /** GET /api/analytics/summary → AnalyticsSummary */
  summary: async (): Promise<AnalyticsSummary> => {
    const res = await apiFetch(`${ANALYTICS_API}/api/analytics/summary`);
    if (!res.ok) throw new Error(`summary: ${res.status}`);
    const s = await res.json();
    return {
      totalTransactions: Number(s.total_transactions ?? 0),
      highRiskCount: Number(s.high_risk ?? 0),
      avgRiskScore: Math.round(Number(s.avg_risk_score ?? 0)),
      totalAlerts: Number(s.total_alerts ?? 0),
      // Backend doesn't provide deltas yet — show 0
      deltaTransactions: 0,
      deltaHighRisk: 0,
      deltaAvgRisk: 0,
      deltaAlerts: 0,
    };
  },

  /** GET /api/analytics/trends → TrendPoint[] */
  trends: async (): Promise<TrendPoint[]> => {
    const res = await apiFetch(`${ANALYTICS_API}/api/analytics/trends`);
    if (!res.ok) throw new Error(`trends: ${res.status}`);
    const json = await res.json();
    const rows = json.trends ?? json;
    return (Array.isArray(rows) ? rows : []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) => ({
        date:
          typeof r.date === "string"
            ? r.date.slice(0, 10)
            : new Date(r.date).toISOString().slice(0, 10),
        fraud: Number(r.fraud_count ?? r.fraud ?? 0),
        total: Number(r.total ?? r.fraud_count ?? 0), // backend only has fraud_count
      }),
    );
  },

  /** GET /api/analytics/countries → CountryStat[] */
  countries: async (): Promise<CountryStat[]> => {
    const res = await apiFetch(`${ANALYTICS_API}/api/analytics/countries`);
    if (!res.ok) throw new Error(`countries: ${res.status}`);
    const json = await res.json();
    const rows = json.countries ?? json;
    return (Array.isArray(rows) ? rows : []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) => ({
        country: r.country,
        code: countryToCode(r.country),
        count: Number(r.fraud_count ?? r.count ?? 0),
      }),
    );
  },

  /** GET /api/transactions/alerts → Alert[] (all alerts) */
  alerts: async (): Promise<Alert[]> => {
    const res = await apiFetch(`${TX_API}/api/transactions/alerts`);
    if (!res.ok) throw new Error(`alerts: ${res.status}`);
    const json = await res.json();
    const rows = json.alerts ?? json;
    return (Array.isArray(rows) ? rows : []).map(transformAlert);
  },

  /** GET /api/transactions/:txId → alerts for a specific transaction */
  alertsFor: async (txId: string): Promise<Alert[]> => {
    const res = await apiFetch(`${TX_API}/api/transactions/${txId}`);
    if (!res.ok) throw new Error(`alertsFor ${txId}: ${res.status}`);
    const json = await res.json();
    const rows = json.alerts ?? [];
    return (Array.isArray(rows) ? rows : []).map(transformAlert);
  },
};

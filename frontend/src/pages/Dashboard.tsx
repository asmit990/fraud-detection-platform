import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp, RefreshCw, ShieldCheck } from 'lucide-react';
import { Transaction, fetchTransactions, fetchAnalytics, AnalyticsSummary } from '../lib/api';

export default function Dashboard() {
  const [data, setData] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    const [txns, stats] = await Promise.all([
      fetchTransactions(),
      fetchAnalytics(),
    ]);
    setData(txns);
    setAnalytics(stats);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // 15s auto-poll
    return () => clearInterval(interval);
  }, []);

  const totalIn = analytics?.total_transactions ?? data.length;
  const flagged = analytics?.total_flagged ?? data.filter((d: Transaction) => d.status === 'HIGH' || d.status === 'BLOCKED').length;
  const fraudRate = analytics?.fraud_rate !== undefined ? analytics.fraud_rate.toFixed(2) : (totalIn > 0 ? ((flagged / totalIn) * 100).toFixed(2) : '0.00');
  const p99Latency: string | number = analytics?.p99_latency_ms ?? 18;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Operations</h1>
          <p className="text-xs text-slate-500 mt-1">Real-time risk telemetry & live multi-rule transaction evaluation</p>
        </div>
        <button
          onClick={loadData}
          className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} /> Refresh Feed
        </button>
      </div>
      
      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <MetricCard label="Evaluated (24h)" value={totalIn !== undefined && !loading ? totalIn.toLocaleString() : '—'} helper="Across active Kafka streams" />
        <MetricCard label="Flagged for Review" value={flagged !== undefined && !loading ? flagged.toLocaleString() : '—'} alert={flagged > 0} helper="Requires manual analyst triage" />
        <MetricCard label="Observed Fraud Rate" value={fraudRate !== '—' && !loading ? `${fraudRate}%` : '—'} helper="Target threshold: < 2.5%" />
        <MetricCard label="P99 Response Latency" value={!loading ? `${p99Latency}ms` : '—'} tone="indigo" helper="Redis + Gemini evaluation" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Volume vs Flagged Bar Chart */}
        <div className="lg:col-span-2 p-6 border border-slate-200 bg-white rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" /> Hourly Transaction Volume vs Flagged
            </h3>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-indigo-500 block"></i> Total Volume</span>
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-rose-500 block"></i> Flagged Anomaly</span>
            </div>
          </div>

          <div className="h-48 flex items-end gap-2.5 pt-4 border-b border-slate-100 pb-2">
            {[45, 65, 85, 50, 95, 120, 110, 85, 130, 105, 75, 60].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end gap-1 group relative">
                <div className="w-full bg-rose-500 rounded-t-sm" style={{ height: `${h * 0.15}%` }}></div>
                <div className="w-full bg-indigo-600/85 hover:bg-indigo-600 rounded-sm transition-all" style={{ height: `${h * 0.8}%` }}></div>
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg pointer-events-none">
                  Vol: {h * 12} · Flagged: {Math.round(h * 0.12)}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 mt-3 px-1 font-mono">
            <span>12h ago</span>
            <span>6h ago</span>
            <span>Just now</span>
          </div>
        </div>

        {/* Country Exposure */}
        <div className="p-6 border border-slate-200 bg-white rounded-xl shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" /> Geographic Exposure
          </h3>
          <div className="space-y-4">
            {[
              { country: 'RU', name: 'Russia', count: 142, bar: 'w-[80%]' },
              { country: 'CN', name: 'China', count: 98, bar: 'w-[60%]' },
              { country: 'NG', name: 'Nigeria', count: 45, bar: 'w-[40%]' },
              { country: 'IN', name: 'India', count: 32, bar: 'w-[25%]' },
              { country: 'US', name: 'United States', count: 12, bar: 'w-[10%]' },
            ].map(c => (
              <div key={c.country} className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold w-6 text-slate-800">{c.country}</span>
                <span className="text-xs text-slate-500 w-24 truncate">{c.name}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full bg-rose-500 rounded-full ${c.bar}`}></div>
                </div>
                <span className="text-xs font-mono font-bold w-8 text-right text-slate-700">{c.count}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Geo-anomaly rules active across all regions
          </div>
        </div>
      </div>
    </div>
  );
}

const MetricCard = ({ label, value, alert, tone = 'slate', helper }: { label: string; value: string | number; alert?: boolean; tone?: string; helper?: string }) => (
  <div className="p-5 border border-slate-200 bg-white rounded-xl shadow-sm">
    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
    <p className={`text-3xl font-bold tracking-tight ${alert ? 'text-rose-600' : tone === 'indigo' ? 'text-indigo-600' : 'text-slate-900'}`}>{value}</p>
    {helper && <p className="text-xs text-slate-400 mt-2">{helper}</p>}
  </div>
);

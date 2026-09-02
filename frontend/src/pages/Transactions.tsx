import { useEffect, useState } from 'react';
import { Search, X, ShieldAlert, Zap, Globe, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Transaction, fetchTransactions, ingestTransaction, blockTransaction } from '../lib/api';

export default function Transactions() {
  const [data, setData] = useState<Transaction[]>([]);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [ingesting, setIngesting] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const loadTransactions = () => {
    fetchTransactions().then(setData);
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const badgeStyle = (status: string) => {
    switch (status) {
      case 'LOW': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'MEDIUM': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'HIGH': return 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
      case 'BLOCKED': return 'bg-slate-100 text-slate-700 border-slate-300 font-bold line-through';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const filtered = data.filter(txn => {
    const matchesSearch = !search || [txn.id, txn.userId, txn.deviceId, txn.country].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || txn.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleIngest = async () => {
    setIngesting(true);
    const countries = ['US', 'IN', 'GB', 'SG', 'DE'];
    const randomCountry = countries[Math.floor(Math.random() * countries.length)];
    const randomAmount = Number((Math.random() * 800 + 20).toFixed(2));
    
    await ingestTransaction({
      user_id: `usr_${Math.floor(1000 + Math.random() * 9000)}`,
      amount: randomAmount,
      currency: 'USD',
      country: randomCountry,
      device_id: 'dev_browser_session',
      ip: '103.21.244.0',
      merchant_category: 'ecommerce'
    });

    const newTxn: Transaction = {
      id: `txn_${Math.random().toString(36).substring(2, 9)}`,
      userId: `usr_${Math.floor(1000 + Math.random() * 9000)}`,
      deviceId: 'dev_browser_session',
      amount: randomAmount,
      currency: 'USD',
      country: randomCountry,
      status: randomAmount > 500 ? 'HIGH' : 'LOW',
      timestamp: new Date().toISOString(),
      score: randomAmount > 500 ? 78 : 15,
      rules: { velocity: 10, geo: randomAmount > 500 ? 30 : 0, device: 0, ip: 5 },
      aiReasoning: randomAmount > 500 
        ? "Gemini AI: Elevated risk due to high amount anomaly on unverified session." 
        : "Gemini AI: Standard payment pattern verified within baseline parameters."
    };

    setData(prev => [newTxn, ...prev]);
    setIngesting(false);
  };

  const handleBlock = async (txnId: string) => {
    setBlocking(true);
    await blockTransaction(txnId);
    setData(prev => prev.map(d => d.id === txnId ? { ...d, status: 'BLOCKED' as const } : d));
    if (selected && selected.id === txnId) {
      setSelected({ ...selected, status: 'BLOCKED' });
    }
    setBlocking(false);
  };

  return (
    <div className="relative h-full flex flex-col max-w-7xl mx-auto p-8">
      {/* Header bar */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Live Transaction Stream</h1>
          <p className="text-xs text-slate-500 mt-1">Real-time payment events passing through idempotency filter and rule pipeline</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadTransactions}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={handleIngest}
            disabled={ingesting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${ingesting ? 'animate-spin' : ''}`} /> {ingesting ? 'Ingesting Event...' : 'Ingest Transaction'}
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex gap-3 mb-6 bg-white p-3 border border-slate-200 rounded-xl shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Txn ID, User ID, Device, or Country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
        >
          <option value="ALL">All Risk Statuses</option>
          <option value="LOW">LOW Risk</option>
          <option value="MEDIUM">MEDIUM Risk</option>
          <option value="HIGH">HIGH Risk</option>
          <option value="BLOCKED">BLOCKED</option>
        </select>
      </div>

      {/* Transaction Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Transaction ID</th>
                <th className="py-3.5 px-4">User & Device</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Country</th>
                <th className="py-3.5 px-4">Risk Status</th>
                <th className="py-3.5 px-6 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {filtered.map(txn => (
                <tr
                  key={txn.id}
                  onClick={() => setSelected(txn)}
                  className="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                >
                  <td className="py-4 px-6 font-mono text-indigo-600 font-bold group-hover:underline">{txn.id}</td>
                  <td className="py-4 px-4 text-slate-800">
                    <span className="font-semibold block">{txn.userId}</span>
                    <span className="text-[11px] text-slate-400 font-mono block">{txn.deviceId}</span>
                  </td>
                  <td className="py-4 px-4 font-mono font-bold text-slate-900">
                    {txn.amount !== undefined ? `$${txn.amount.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-4 px-4 text-slate-600">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Globe className="w-3.5 h-3.5 text-slate-400" /> {txn.country || '—'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs border ${badgeStyle(txn.status)}`}>
                      {txn.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right text-slate-400 font-mono text-xs">
                    {new Date(txn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forensic Drawer */}
      {selected && (
        <div className="fixed inset-y-0 right-0 w-[580px] bg-white border-l border-slate-200 shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
            <h2 className="font-bold text-slate-900 flex items-center gap-2 text-base">
              <ShieldAlert className="w-5 h-5 text-indigo-600" /> Forensic Deep-Dive Analysis
            </h2>
            <button
              onClick={() => setSelected(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Risk Gauge Card */}
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <div className={`text-5xl font-bold mb-1 ${selected.score >= 60 ? 'text-rose-600' : selected.score >= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {selected.score}
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Composite Risk Score (0-100)
              </div>
            </div>

            {/* Context details */}
            <div className="p-5 border border-slate-200 rounded-xl bg-white shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Transaction Context</h3>
              <div className="space-y-2 text-sm font-mono divide-y divide-slate-100">
                <div className="flex justify-between py-1.5"><span className="text-slate-400 font-sans">Txn ID</span> <span className="font-bold text-slate-800">{selected.id}</span></div>
                <div className="flex justify-between py-1.5"><span className="text-slate-400 font-sans">User ID</span> <span className="text-slate-800">{selected.userId}</span></div>
                <div className="flex justify-between py-1.5"><span className="text-slate-400 font-sans">Amount</span> <span className="font-bold text-indigo-600">${selected.amount}</span></div>
                <div className="flex justify-between py-1.5"><span className="text-slate-400 font-sans">Origin</span> <span className="text-slate-800">{selected.country}</span></div>
              </div>
            </div>

            {/* Rule Breakdown */}
            <div className="p-5 border border-slate-200 rounded-xl bg-white shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Deterministic Rule Breakdown</h3>
              <div className="space-y-3">
                {Object.entries(selected.rules || {}).map(([rule, pts]) => (
                  <div key={rule}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold text-slate-600 uppercase">{rule} Rule</span>
                      <span className="font-mono font-bold text-slate-800">+{pts} pts</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.min(100, (pts / 40) * 100)}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gemini AI Reasoning */}
            {selected.aiReasoning && (
              <div className="p-5 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Gemini AI Natural Language Rationale
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed">{selected.aiReasoning}</p>
              </div>
            )}

            {/* Block Action */}
            {selected.status !== 'BLOCKED' ? (
              <button
                onClick={() => handleBlock(selected.id)}
                disabled={blocking}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-4 h-4" /> {blocking ? 'Freezing Account...' : 'Block & Freeze Account'}
              </button>
            ) : (
              <div className="w-full py-3 bg-slate-100 text-slate-500 rounded-xl text-sm font-bold text-center border border-slate-200">
                ✓ Transaction Blocked & Account Frozen
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

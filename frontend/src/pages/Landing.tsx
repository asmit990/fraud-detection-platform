import { Link } from 'react-router-dom';
import { Shield, Zap, Search, Lock, Server, ArrowRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-slate-200 bg-white/95 sticky top-0 z-50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-slate-900">Aegis Fraud Engine</span>
          <span className="ml-3 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs border border-emerald-200 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Engine Live & Connected
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors">
            Sign In
          </Link>
          <Link to="/dashboard" className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-1.5">
            Open Console <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 pt-24 pb-20">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-6">
            <Zap className="w-3.5 h-3.5" /> Sub-50ms Risk Evaluation Stream
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-slate-950 mb-6 leading-tight">
            Real-Time Payment <br />
            <span className="text-indigo-600">Fraud Prevention</span>
          </h1>
          <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto">
            Deterministic multi-rule evaluation running parallel in Redis with Google Gemini AI natural language explainability, Stripe-standard idempotency, and Kafka transactional outbox resilience.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/dashboard" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md shadow-indigo-600/20 transition-all">
              Launch Live Console
            </Link>
            <Link to="/login" className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg font-bold transition-all">
              1-Click Demo Accounts
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FeatureCard
            icon={<Zap className="w-5 h-5 text-indigo-600" />}
            title="8 Parallel Deterministic Rules"
            desc="Sliding-window velocity counters, cross-border impossible travel, device fingerprints, and TOR IP reputation evaluated in microseconds."
          />
          <FeatureCard
            icon={<Search className="w-5 h-5 text-indigo-600" />}
            title="Gemini AI Explainability"
            desc="Generative forensic reasoning summarizing complex anomalous vectors so risk analysts make swift, defensible block decisions."
          />
          <FeatureCard
            icon={<Lock className="w-5 h-5 text-indigo-600" />}
            title="High-Frequency Safeguards"
            desc="Self-service velocity limit relaxation for verified merchants coupled with strict geographic perimeter and device locks."
          />
          <FeatureCard
            icon={<Server className="w-5 h-5 text-indigo-600" />}
            title="Transactional Outbox & DLQ"
            desc="Zero event loss during network partitions with automated Dead Letter Queue recovery and Stripe-standard Idempotency-Key protection."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500 bg-slate-50">
        <div className="flex justify-center gap-6 mb-2">
          <a href="#" className="hover:text-slate-800">GitHub</a>
          <a href="#" className="hover:text-slate-800">API Documentation</a>
          <a href="#" className="hover:text-slate-800">Kafka Architecture</a>
        </div>
        <p>© 2026 Aegis Security Inc. Production Engine Operational.</p>
      </footer>
    </div>
  );
}

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
    <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
      {icon}
    </div>
    <h3 className="text-slate-900 font-bold text-base mb-2">{title}</h3>
    <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
  </div>
);

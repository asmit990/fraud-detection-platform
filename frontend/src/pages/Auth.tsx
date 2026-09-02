import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, ArrowRight } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('analyst');
  const navigate = useNavigate();

  const handleDemo = (demoRole: string) => {
    localStorage.setItem('auth_token', 'demo-token-123');
    localStorage.setItem('fraud_user', JSON.stringify({ name: demoRole === 'Analyst' ? 'Asmit (Lead Analyst)' : 'Global Merchant Corp', role: demoRole }));
    navigate('/dashboard');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('auth_token', `token_${Date.now()}`);
    localStorage.setItem('fraud_user', JSON.stringify({ name: name || email.split('@')[0] || 'Analyst', role }));
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">
          {isLogin ? 'Sign in to Aegis' : 'Create Security Account'}
        </h2>
        <p className="text-xs text-center text-slate-500 mb-6">
          {isLogin ? 'Enter your authorized credentials to access risk telemetry.' : 'Register a new clearance level for platform operations.'}
        </p>
        
        <form className="space-y-4 mb-6" onSubmit={handleSubmit}>
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Asmit Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Work Email</label>
            <input
              type="email"
              required
              placeholder="analyst@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Clearance Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              >
                <option value="analyst">Security / Risk Analyst</option>
                <option value="admin">Platform Administrator</option>
                <option value="merchant">High-Frequency Merchant</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
          >
            {isLogin ? 'Sign In to Console' : 'Register Clearance'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative mb-6 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <span className="relative bg-white px-3 text-xs font-bold text-slate-400 uppercase tracking-widest">1-Click Instant Demo</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleDemo('Analyst')}
            className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg py-2.5 text-xs font-bold border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
          >
            <User className="w-3.5 h-3.5 text-indigo-600" /> Analyst Demo
          </button>
          <button
            onClick={() => handleDemo('Power User')}
            className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg py-2.5 text-xs font-bold border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-amber-600" /> Power User
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-indigo-600 font-bold hover:underline">
            {isLogin ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

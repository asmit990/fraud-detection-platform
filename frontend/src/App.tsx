import { BrowserRouter, Routes, Route, Link, Outlet, useLocation } from 'react-router-dom';
import { Shield, Activity, List, Settings, LogOut } from 'lucide-react';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import SettingsPage from './pages/Settings';

const Layout = () => {
  const location = useLocation();

  const navItemClass = (path: string) => {
    const active = location.pathname === path;
    return `flex items-center gap-3 px-3.5 py-2.5 text-sm rounded-lg transition-all ${
      active
        ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Crisp White Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white p-5 flex flex-col shadow-sm">
        <Link to="/" className="flex items-center gap-2.5 text-indigo-600 mb-8 px-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-base text-slate-900 block leading-tight">Aegis Console</span>
            <span className="text-[11px] text-slate-400 font-mono tracking-widest uppercase block">Risk Engine</span>
          </div>
        </Link>

        <nav className="flex flex-col gap-1.5 flex-grow">
          <Link to="/dashboard" className={navItemClass('/dashboard')}>
            <Activity className="w-4 h-4" /> Dashboard
          </Link>
          <Link to="/transactions" className={navItemClass('/transactions')}>
            <List className="w-4 h-4" /> Transactions
          </Link>
          <Link to="/settings" className={navItemClass('/settings')}>
            <Settings className="w-4 h-4" /> Safeguards
          </Link>
        </nav>

        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = '/';
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto bg-slate-50">
        <Outlet />
      </main>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Auth />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

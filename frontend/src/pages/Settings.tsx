import { useState } from 'react';
import { User, Lock, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';

export default function Settings() {
  const [hfMode, setHfMode] = useState(false);
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');

  const user = JSON.parse(localStorage.getItem('fraud_user') || '{"name":"Asmit (Security Lead)","role":"analyst"}');

  const handleEnable = () => {
    if (step === 3 && otp.length === 6) {
      setHfMode(true);
      setStep(1);
      setOtp('');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="font-instrument text-4xl font-normal text-slate-900 mb-8 tracking-tight">Safeguards & Profile</h1>
      
      {/* User profile card */}
      <div className="flex items-center gap-4 p-6 bg-white border border-slate-200 rounded-xl shadow-sm mb-8">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
          <User className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{user.name}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Role: <span className="capitalize font-mono font-bold text-indigo-600">{user.role}</span> · Session Verified & Active
          </p>
        </div>
      </div>

      {/* High Frequency Mode Card */}
      <div className="border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-start bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600" /> High-Frequency Transactor Mode
            </h3>
            <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
              Increases velocity thresholds (up to 50 txns/10m) for verified merchant accounts while tangling strict geolocation and recognized device security perimeters.
            </p>
          </div>
          {hfMode ? (
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Active (50 txns/10m)
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-xs font-semibold">
              Standard Mode (5 txns/10m)
            </span>
          )}
        </div>

        {!hfMode && (
          <div className="p-6 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-xl border transition-all ${step >= 1 ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200'}`}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">1. Risk Notice</h4>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">Velocity limits relaxed. Rapid cross-border hops will trigger immediate alarm.</p>
                <button
                  onClick={() => setStep(2)}
                  className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all"
                >
                  I Understand Risks
                </button>
              </div>

              <div className={`p-4 rounded-xl border transition-all ${step >= 2 ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200 opacity-50'}`}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">2. Perimeter Lock</h4>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">Lock payments strictly to your current IP and verified hardware device.</p>
                {step >= 2 && (
                  <button
                    onClick={() => setStep(3)}
                    className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all"
                  >
                    Lock Current Region
                  </button>
                )}
              </div>

              <div className={`p-4 rounded-xl border transition-all ${step >= 3 ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200 opacity-50'}`}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">3. 2FA Verification</h4>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">Enter 6-digit confirmation code.</p>
                {step >= 3 && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="481920"
                      className="w-24 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-sm text-center font-mono focus:outline-none focus:border-indigo-500 font-bold"
                    />
                    <button
                      onClick={handleEnable}
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all"
                    >
                      Enable
                    </button>
                  </div>
                )}
              </div>
            </div>

            {step === 1 && (
              <p className="text-xs text-slate-500 mt-5 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" /> High-frequency mode logs security telemetry in Redis and Postgres outbox tables.
              </p>
            )}
          </div>
        )}

        {hfMode && (
          <div className="p-6 bg-emerald-50/60 border-t border-emerald-100">
            <div className="flex items-center gap-2 text-sm text-emerald-800 font-bold mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> High-Frequency Safeguard Active
            </div>
            <p className="text-xs text-emerald-700 font-mono">
              Velocity Cap: 50 txns/10m · Geo-Fence: Active · Hardware-Lock: Verified
            </p>
            <button
              onClick={() => setHfMode(false)}
              className="mt-4 text-xs bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold px-3.5 py-2 rounded-lg transition-colors shadow-sm"
            >
              Revert to Standard Mode
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

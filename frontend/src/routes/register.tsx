import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { ShieldCheck, Terminal, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useRegister } from "@/api/authQueries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register · Sentinel" },
      { name: "description", content: "Create your Sentinel fraud intelligence account." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) navigate({ to: "/" });
  }, [isAuthenticated, navigate]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const register = useRegister();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters");
      return;
    }

    register.mutate(
      { name, email, password },
      { onSuccess: () => navigate({ to: "/" }) }
    );
  };

  const errorMsg = localError || (register.isError ? register.error?.message : "");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-64 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-brand/8 blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative">
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-chart-5 shadow-soft mb-4">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Sentinel</h1>
          <p className="mt-1 text-sm text-muted-foreground font-mono">
            <span className="text-brand">›</span> fraud-intelligence-platform
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface shadow-pop overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-2">
            <div className="h-3 w-3 rounded-full bg-risk-high/70" />
            <div className="h-3 w-3 rounded-full bg-risk-medium/70" />
            <div className="h-3 w-3 rounded-full bg-risk-low/70" />
            <span className="ml-2 text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
              <Terminal className="h-3 w-3" /> sentinel-auth — register
            </span>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="font-mono text-xs text-muted-foreground border-l-2 border-brand pl-3 py-0.5">
              $ auth register --new-analyst
            </div>

            {errorMsg && (
              <div className="rounded-lg border border-risk-high/30 bg-risk-high/8 px-4 py-3 text-sm text-risk-high font-mono">
                <span className="text-risk-high/60">ERR</span> {errorMsg}
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                display_name
              </label>
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Jane Analyst"
                className={cn(
                  "w-full rounded-lg border bg-surface-2 px-3 py-2.5 text-sm font-mono",
                  "placeholder:text-muted-foreground/50 outline-none transition",
                  "focus:ring-2 focus:ring-brand/30 focus:border-brand/60",
                  "border-border"
                )}
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                email_address
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="analyst@company.com"
                className={cn(
                  "w-full rounded-lg border bg-surface-2 px-3 py-2.5 text-sm font-mono",
                  "placeholder:text-muted-foreground/50 outline-none transition",
                  "focus:ring-2 focus:ring-brand/30 focus:border-brand/60",
                  "border-border"
                )}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                password{" "}
                <span className="text-muted-foreground/50 normal-case tracking-normal">(min 8 chars)</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className={cn(
                    "w-full rounded-lg border bg-surface-2 px-3 py-2.5 pr-10 text-sm font-mono",
                    "placeholder:text-muted-foreground/50 outline-none transition",
                    "focus:ring-2 focus:ring-brand/30 focus:border-brand/60",
                    "border-border"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Strength indicator */}
              <div className="flex gap-1 pt-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-all",
                      password.length === 0
                        ? "bg-border"
                        : password.length < 8
                        ? i < 1 ? "bg-risk-high" : "bg-border"
                        : password.length < 12
                        ? i < 2 ? "bg-risk-medium" : "bg-border"
                        : password.length < 16
                        ? i < 3 ? "bg-risk-low" : "bg-border"
                        : "bg-risk-low"
                    )}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={register.isPending}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
                "bg-brand text-white hover:bg-brand/90 active:scale-[0.98]",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {register.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                "Create account"
              )}
            </button>

            <p className="text-center text-xs text-muted-foreground font-mono">
              already registered?{" "}
              <Link to="/login" className="text-brand hover:underline">
                login --existing
              </Link>
            </p>
          </form>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground/60 font-mono">
          secured with jwt · bcrypt · tls
        </p>
      </div>
    </div>
  );
}

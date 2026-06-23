import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { ShieldCheck, Terminal, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useLogin } from "@/api/authQueries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In · Sentinel" },
      { name: "description", content: "Sign in to the Sentinel fraud intelligence platform." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) navigate({ to: "/" });
  }, [isAuthenticated, navigate]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const login = useLogin();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: () => navigate({ to: "/" }),
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-64 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-brand/8 blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-chart-5 shadow-soft mb-4">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Sentinel</h1>
          <p className="mt-1 text-sm text-muted-foreground font-mono">
            <span className="text-brand">›</span> fraud-intelligence-platform
          </p>
        </div>

        {/* Terminal-style card */}
        <div className="rounded-2xl border border-border bg-surface shadow-pop overflow-hidden">
          {/* Terminal bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-2">
            <div className="h-3 w-3 rounded-full bg-risk-high/70" />
            <div className="h-3 w-3 rounded-full bg-risk-medium/70" />
            <div className="h-3 w-3 rounded-full bg-risk-low/70" />
            <span className="ml-2 text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
              <Terminal className="h-3 w-3" /> sentinel-auth — authenticate
            </span>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="font-mono text-xs text-muted-foreground border-l-2 border-brand pl-3 py-0.5">
              $ auth login --secure
            </div>

            {/* Error */}
            {login.isError && (
              <div className="rounded-lg border border-risk-high/30 bg-risk-high/8 px-4 py-3 text-sm text-risk-high font-mono">
                <span className="text-risk-high/60">ERR</span> {login.error?.message ?? "Authentication failed"}
              </div>
            )}

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
                password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
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
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={login.isPending}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
                "bg-brand text-white hover:bg-brand/90 active:scale-[0.98]",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {login.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating…
                </>
              ) : (
                "Sign in"
              )}
            </button>

            <p className="text-center text-xs text-muted-foreground font-mono">
              no account?{" "}
              <Link to="/register" className="text-brand hover:underline">
                register --new
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

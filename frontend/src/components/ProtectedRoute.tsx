import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuthStore, getStoredToken } from "@/store/authStore";
import { authClient } from "@/api/authClient";
import type { ReactNode } from "react";

/**
 * Wraps protected pages. On mount it:
 *  1. Checks the in-memory store first — if authenticated, renders immediately.
 *  2. Falls back to localStorage token — calls /me to validate and restore session.
 *  3. If neither, redirects to /login.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) return;

    const token = getStoredToken();
    if (!token) {
      navigate({ to: "/login" });
      return;
    }

    authClient
      .me(token)
      .then(({ user }) => {
        setAuth(user, token);
      })
      .catch(() => {
        clearAuth();
        navigate({ to: "/login" });
      });
  }, [isAuthenticated, setAuth, clearAuth, navigate]);

  if (!isAuthenticated) {
    // Render nothing while validating — avoids flash of protected content
    return null;
  }

  return <>{children}</>;
}

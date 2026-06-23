import type { AuthUser } from "@/store/authStore";

const AUTH_API =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_AUTH_API
    ? import.meta.env.VITE_AUTH_API
    : "http://localhost:3004";

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${AUTH_API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? `Request failed: ${res.status}`);
  }

  return data as T;
}

export const authClient = {
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: (token: string) =>
    request<{ user: AuthUser }>("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

import { useMutation, useQuery } from "@tanstack/react-query";
import { authClient } from "./authClient";
import { useAuthStore, getStoredToken } from "@/store/authStore";

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authClient.login(email, password),
    onSuccess: ({ token, user }) => {
      setAuth(user, token);
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: ({
      name,
      email,
      password,
    }: {
      name: string;
      email: string;
      password: string;
    }) => authClient.register(name, email, password),
    onSuccess: ({ token, user }) => {
      setAuth(user, token);
    },
  });
}

export function useMe() {
  const token = getStoredToken();
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      if (!token) throw new Error("No token");
      const { user } = await authClient.me(token);
      setAuth(user, token);
      return user;
    },
    enabled: !!token,
    retry: false,
    onError: () => {
      clearAuth();
    },
  } as any);
}

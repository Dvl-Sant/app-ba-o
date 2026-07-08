import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, clearAuth, getStoredAuth, setStoredAuth } from "./api.js";
import type { PublicUser } from "./types.js";

interface AuthState {
  user: PublicUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (body: { name?: string; currentPassword?: string; newPassword?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(() => getStoredAuth()?.user ?? null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredAuth();
    if (!stored) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((res) => {
        setUser(res.user);
        setStoredAuth(stored.token, res.user);
      })
      .catch(() => {
        clearAuth();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: async (username, password) => {
        const res = await api.login(username, password);
        setStoredAuth(res.token, res.user);
        setUser(res.user);
      },
      register: async (username, name, password) => {
        const res = await api.register(username, name, password);
        setStoredAuth(res.token, res.user);
        setUser(res.user);
      },
      logout: () => {
        clearAuth();
        setUser(null);
      },
      updateProfile: async (body) => {
        const res = await api.updateMe(body);
        setStoredAuth(res.token, res.user);
        setUser(res.user);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

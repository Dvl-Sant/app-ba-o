import type { AuthResponse, BanoStateDTO, ChatMessage, HistoryEntry, PublicUser, RankingEntry, UserRole } from "./types.js";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";
const TOKEN_KEY = "bano_token";
const USER_KEY = "bano_user";

export function getStoredAuth(): { token: string; user: PublicUser } | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  if (!token || !userRaw) return null;
  try {
    return { token, user: JSON.parse(userRaw) as PublicUser };
  } catch {
    return null;
  }
}

export function setStoredAuth(token: string, user: PublicUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export class BanoApiError extends Error {
  constructor(public readonly status: number, public readonly code: string | null) {
    super(`API error ${status}`);
    this.name = "BanoApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const incoming = (init.headers ?? {}) as Record<string, string>;
  const headers: Record<string, string> = { ...incoming };
  if (init.body && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }
  const token = getStoredToken();
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let code: string | null = null;
    try {
      const detail = (await res.json()) as unknown;
      if (detail && typeof detail === "object" && "error" in detail) {
        code = String((detail as { error: unknown }).error);
      }
    } catch {
      /* ignore */
    }
    throw new BanoApiError(res.status, code);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  register: (username: string, name: string, password: string) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, name, password }),
    }),
  login: (username: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  me: () => request<{ user: PublicUser }>("/auth/me"),
  state: () => request<BanoStateDTO>("/state"),
  lock: () => request<BanoStateDTO>("/bathroom/lock", { method: "POST" }),
  unlock: () => request<BanoStateDTO>("/bathroom/unlock", { method: "POST" }),
  extend: () => request<BanoStateDTO>("/bathroom/extend", { method: "POST" }),
  panic: (value: boolean) =>
    request<BanoStateDTO>("/bathroom/panic", { method: "POST", body: JSON.stringify({ value }) }),
  joinQueue: () => request<BanoStateDTO>("/queue/join", { method: "POST" }),
  leaveQueue: () => request<BanoStateDTO>("/queue/leave", { method: "POST" }),
  adminHistory: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const qs = q.toString();
    return request<{ history: HistoryEntry[] }>(`/admin/history${qs ? `?${qs}` : ""}`);
  },
  ranking: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const qs = q.toString();
    return request<{ ranking: RankingEntry[] }>(`/ranking${qs ? `?${qs}` : ""}`);
  },
  chatMessages: (since?: number) => {
    const q = new URLSearchParams();
    if (since !== undefined) q.set("since", new Date(since).toISOString());
    const qs = q.toString();
    return request<{ messages: ChatMessage[] }>(`/chat${qs ? `?${qs}` : ""}`);
  },
  sendChat: (body: string) =>
    request<{ message: ChatMessage }>("/chat", { method: "POST", body: JSON.stringify({ body }) }),
  listUsers: () => request<{ users: PublicUser[] }>("/users"),
  updateUser: (id: string, body: { name?: string; role?: UserRole }) =>
    request<{ user: PublicUser }>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteUser: (id: string) => request<void>(`/users/${id}`, { method: "DELETE" }),
  resetPassword: (id: string) =>
    request<{ ok: true; defaultPassword: string }>(`/users/${id}/reset-password`, { method: "POST" }),
  updateMe: (body: { name?: string; currentPassword?: string; newPassword?: string }) =>
    request<AuthResponse>("/auth/me", { method: "PATCH", body: JSON.stringify(body) }),
};

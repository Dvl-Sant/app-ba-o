export type BanoStatus = "free" | "occupied";
export type BanoSource = "manual" | "sensor";

export interface BanoStateDTO {
  status: BanoStatus;
  source: BanoSource;
  lockedBy: string | null;
  lockedAt: number | null;
  expiresAt: number | null;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

const TOKEN_KEY = "bano_session_token";
const TOKEN_EXP_KEY = "bano_session_expires_at";
const QR_KEY_STORE = "bano_qr_key";

export function getStoredToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiresAt = Number(localStorage.getItem(TOKEN_EXP_KEY) ?? 0);
  if (!token) return null;
  if (expiresAt && expiresAt < Date.now()) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXP_KEY);
    return null;
  }
  return token;
}

export function setStoredToken(token: string, expiresInMs: number): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + expiresInMs));
}

export function getStoredKey(): string | null {
  return localStorage.getItem(QR_KEY_STORE);
}

export function setStoredKey(k: string): void {
  localStorage.setItem(QR_KEY_STORE, k);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXP_KEY);
}

export function clearAll(): void {
  clearSession();
  localStorage.removeItem(QR_KEY_STORE);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const incoming = (init.headers ?? {}) as Record<string, string>;
  const headers: Record<string, string> = { ...incoming };
  if (init.body && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let detail: unknown = null;
    try {
      detail = await res.json();
    } catch {
      /* ignore */
    }
    throw new BanoApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export class BanoApiError extends Error {
  constructor(public readonly status: number, public readonly detail: unknown) {
    super(`API error ${status}`);
    this.name = "BanoApiError";
  }
}

export function authWithKey(k: string): Promise<{ sessionToken: string; expiresInMs: number }> {
  return request("/auth", { method: "POST", body: JSON.stringify({ k }) });
}

export function fetchState(): Promise<BanoStateDTO> {
  return request<BanoStateDTO>("/state");
}

export function lockOrUnlock(token: string, action: "lock" | "unlock"): Promise<BanoStateDTO> {
  return request<BanoStateDTO>(`/${action}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

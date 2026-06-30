import { randomUUID } from "node:crypto";
import { LOCK_DURATION_MS, SENSOR_TIMEOUT_MS, SESSION_DURATION_MS } from "./config.js";

export type BanoStatus = "free" | "occupied";
export type BanoSource = "manual" | "sensor";

export interface Session {
  token: string;
  expiresAt: number;
}

export interface BanoState {
  status: BanoStatus;
  source: BanoSource;
  lockedBy: string | null;
  lockedAt: number | null;
  expiresAt: number | null;
}

interface InternalState extends BanoState {
  lastSensorAt: number | null;
}

const state: InternalState = {
  status: "free",
  source: "manual",
  lockedBy: null,
  lockedAt: null,
  expiresAt: null,
  lastSensorAt: null,
};

const sessions = new Map<string, Session>();

const now = () => Date.now();

export function getPublicState(): BanoState {
  purge();
  const { lastSensorAt: _drop, ...publicState } = state;
  return publicState;
}

export function createSession(): Session {
  purge();
  const session: Session = {
    token: randomUUID(),
    expiresAt: now() + SESSION_DURATION_MS,
  };
  sessions.set(session.token, session);
  return session;
}

export function isSessionValid(token: string | null | undefined): boolean {
  if (!token) return false;
  purge();
  const s = sessions.get(token);
  if (!s) return false;
  if (s.expiresAt < now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

export function claimLock(token: string | null): { ok: true } | { ok: false; reason: string } {
  purge();
  if (state.source === "sensor") {
    return { ok: false, reason: "sensor_active" };
  }
  if (!isSessionValid(token)) {
    return { ok: false, reason: "invalid_session" };
  }
  if (state.status === "occupied" && state.lockedBy !== token) {
    return { ok: false, reason: "already_locked" };
  }
  state.status = "occupied";
  state.source = "manual";
  state.lockedBy = token;
  state.lockedAt = now();
  state.expiresAt = now() + LOCK_DURATION_MS;
  return { ok: true };
}

export function releaseLock(token: string | null): { ok: true } | { ok: false; reason: string } {
  purge();
  if (state.source === "sensor") {
    return { ok: false, reason: "sensor_active" };
  }
  if (!isSessionValid(token)) {
    return { ok: false, reason: "invalid_session" };
  }
  if (state.lockedBy !== token) {
    return { ok: false, reason: "not_owner" };
  }
  state.status = "free";
  state.source = "manual";
  state.lockedBy = null;
  state.lockedAt = null;
  state.expiresAt = null;
  return { ok: true };
}

export function setSensorState(occupied: boolean): void {
  purge();
  state.source = "sensor";
  state.lastSensorAt = now();
  state.lockedBy = null;
  state.lockedAt = now();
  state.expiresAt = null;
  state.status = occupied ? "occupied" : "free";
}

export function purge(): void {
  const t = now();
  for (const [token, s] of sessions) {
    if (s.expiresAt < t) sessions.delete(token);
  }
  if (state.source === "manual" && state.status === "occupied" && state.expiresAt !== null && state.expiresAt < t) {
    state.status = "free";
    state.lockedBy = null;
    state.lockedAt = null;
    state.expiresAt = null;
  }
  if (
    state.source === "sensor" &&
    state.lastSensorAt !== null &&
    state.lastSensorAt + SENSOR_TIMEOUT_MS < t
  ) {
    state.source = "manual";
    state.status = "free";
    state.lockedBy = null;
    state.lockedAt = null;
    state.expiresAt = null;
    state.lastSensorAt = null;
  }
}

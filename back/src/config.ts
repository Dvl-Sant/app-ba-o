import { randomUUID } from "node:crypto";

export const PORT = Number(process.env.PORT ?? 3000);
export const HOST = process.env.HOST ?? "0.0.0.0";

export const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/bano";

const envJwt = process.env.JWT_SECRET;
if (!envJwt) {
  console.warn("[config] JWT_SECRET not set. Using random secret for this run (tokens won't survive restart).");
}
export const JWT_SECRET = envJwt ?? randomUUID();
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

export const LOCK_DURATION_MS = Number(process.env.LOCK_DURATION_MS ?? 10 * 60 * 1000);
export const CLAIM_WINDOW_MS = Number(process.env.CLAIM_WINDOW_MS ?? 60 * 1000);
export const EXTRA_MINUTES_MS = Number(process.env.EXTRA_MINUTES_MS ?? 60 * 1000);
export const EXTRA_MAX = Number(process.env.EXTRA_MAX ?? 5);

export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";

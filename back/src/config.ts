import { randomUUID } from "node:crypto";

export const PORT = Number(process.env.PORT ?? 3000);
export const HOST = process.env.HOST ?? "0.0.0.0";

export const LOCK_DURATION_MS = Number(process.env.LOCK_DURATION_MS ?? 10 * 60 * 1000);
export const SESSION_DURATION_MS = Number(process.env.SESSION_DURATION_MS ?? 10 * 60 * 1000);

const envKey = process.env.BANO_QR_KEY;
if (!envKey) {
  console.warn("[config] BANO_QR_KEY not set. Using random key for this run (QR will not be stable).");
}
export const QR_KEY = envKey ?? randomUUID();

export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";

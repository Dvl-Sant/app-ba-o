import type { FastifyRequest } from "fastify";
import { verifyToken, type JwtPayload } from "./jwt.js";

export function getUser(req: FastifyRequest): JwtPayload | null {
  const h = req.headers.authorization;
  if (!h) return null;
  const header = Array.isArray(h) ? h[0] : h;
  if (!header) return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    return verifyToken(m[1].trim());
  } catch {
    return null;
  }
}

export function requireUser(req: FastifyRequest): JwtPayload {
  const u = getUser(req);
  if (!u) throw new Error("unauthorized");
  return u;
}

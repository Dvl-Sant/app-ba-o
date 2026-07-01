import type { FastifyInstance, FastifyRequest } from "fastify";
import { and, count, desc, gte, lte, sum } from "drizzle-orm";
import { db } from "../db/client.js";
import { usageLog } from "../db/schema.js";
import { getUser } from "../auth/middleware.js";
import { HttpError } from "../errors.js";

function requireAuth(req: FastifyRequest) {
  const u = getUser(req);
  if (!u) throw new HttpError(401, "unauthorized");
  return u;
}

function buildRange(from?: string, to?: string) {
  const conds = [];
  if (from) {
    const f = new Date(from);
    if (!Number.isNaN(f.getTime())) conds.push(gte(usageLog.unlockedAt, f));
  }
  if (to) {
    const t = new Date(`${to}T23:59:59`);
    if (!Number.isNaN(t.getTime())) conds.push(lte(usageLog.unlockedAt, t));
  }
  return conds.length ? and(...conds) : undefined;
}

export function registerStatsRoutes(app: FastifyInstance): void {
  app.get<{ Querystring: { from?: string; to?: string } }>("/ranking", async (req) => {
    requireAuth(req);
    const where = buildRange(req.query.from, req.query.to);
    const rows = await db
      .select({
        userId: usageLog.userId,
        userName: usageLog.userName,
        count: count(),
        totalMs: sum(usageLog.durationMs),
      })
      .from(usageLog)
      .where(where)
      .groupBy(usageLog.userId, usageLog.userName)
      .orderBy(desc(count()));
    return {
      ranking: rows.map((r) => ({
        userId: r.userId,
        userName: r.userName,
        count: Number(r.count),
        totalMs: Number(r.totalMs ?? 0),
      })),
    };
  });
}

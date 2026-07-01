import type { FastifyInstance, FastifyRequest } from "fastify";
import { and, count, desc, gte, lte, sum } from "drizzle-orm";
import { db } from "../db/client.js";
import { usageLog, type UsageReason } from "../db/schema.js";
import { getUser } from "../auth/middleware.js";
import { HttpError } from "../errors.js";

function requireAdmin(req: FastifyRequest): void {
  const u = getUser(req);
  if (!u) throw new HttpError(401, "unauthorized");
  if (u.role !== "admin") throw new HttpError(403, "admin_required");
}

function buildDateRange(from?: string, to?: string): ReturnType<typeof and> | undefined {
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

export function registerAdminRoutes(app: FastifyInstance): void {
  app.get<{ Querystring: { from?: string; to?: string } }>("/admin/history", async (req) => {
    requireAdmin(req);
    const where = buildDateRange(req.query.from, req.query.to);
    const rows = await db
      .select()
      .from(usageLog)
      .where(where)
      .orderBy(desc(usageLog.unlockedAt))
      .limit(500);
    return {
      history: rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: r.userName,
        lockedAt: r.lockedAt.getTime(),
        unlockedAt: r.unlockedAt.getTime(),
        durationMs: r.durationMs,
        extraMinutesUsed: r.extraMinutesUsed,
        reason: r.reason as UsageReason,
      })),
    };
  });

  app.get<{ Querystring: { from?: string; to?: string } }>("/admin/ranking", async (req) => {
    requireAdmin(req);
    const where = buildDateRange(req.query.from, req.query.to);
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

import type { FastifyInstance, FastifyRequest } from "fastify";
import { desc, gt } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { chatMessages } from "../db/schema.js";
import { getUser } from "../auth/middleware.js";
import { canAccessChat } from "../auth/roles.js";
import { HttpError } from "../errors.js";

function requireAuth(req: FastifyRequest) {
  const u = getUser(req);
  if (!u) throw new HttpError(401, "unauthorized");
  if (!canAccessChat(u.role)) throw new HttpError(403, "forbidden");
  return u;
}

const bodySchema = z.object({ body: z.string().min(1).max(500) });

function toDto(m: { id: string; userId: string | null; userName: string; body: string; createdAt: Date }) {
  return {
    id: m.id,
    userId: m.userId,
    userName: m.userName,
    body: m.body,
    createdAt: m.createdAt.getTime(),
  };
}

export async function registerChatRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { since?: string } }>("/chat", async (req) => {
    requireAuth(req);
    let where;
    let limit = 50;
    if (req.query.since) {
      const s = new Date(req.query.since);
      if (!Number.isNaN(s.getTime())) {
        where = gt(chatMessages.createdAt, s);
        limit = 200;
      }
    }
    const rows = await db
      .select()
      .from(chatMessages)
      .where(where)
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
    return { messages: rows.reverse().map(toDto) };
  });

  app.post("/chat", async (req, reply) => {
    const u = requireAuth(req);
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "invalid_body");
    const body = parsed.data.body.trim();
    if (!body) throw new HttpError(400, "empty_body");
    const [created] = await db
      .insert(chatMessages)
      .values({ userId: u.sub, userName: u.name, body })
      .returning();
    return reply.code(201).send({ message: toDto(created) });
  });
}

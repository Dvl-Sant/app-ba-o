import type { FastifyInstance } from "fastify";
import { QR_KEY } from "./config.js";
import {
  claimLock,
  createSession,
  getPublicState,
  isSessionValid,
  releaseLock,
} from "./state.js";

function extractToken(req: { headers: Record<string, string | string[] | undefined> }): string | null {
  const h = req.headers.authorization;
  if (!h) return null;
  const match = Array.isArray(h) ? h[0] : h;
  if (!match) return null;
  const m = match.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

export function registerRoutes(app: FastifyInstance): void {
  app.get("/health", async () => ({ status: "ok" }));

  app.get("/state", async () => getPublicState());

  app.post<{ Body: { k?: string } }>(
    "/auth",
    {
      schema: {
        body: {
          type: "object",
          properties: { k: { type: "string" } },
          required: ["k"],
        },
      },
    },
    async (req, reply) => {
      const { k } = req.body ?? {};
      if (!k || k !== QR_KEY) {
        return reply.code(401).send({ error: "invalid_key" });
      }
      const session = createSession();
      return reply.code(200).send({
        sessionToken: session.token,
        expiresInMs: session.expiresAt - Date.now(),
      });
    },
  );

  app.post("/lock", async (req, reply) => {
    const token = extractToken(req);
    const result = claimLock(token);
    if (!result.ok) {
      const code = result.reason === "invalid_session" ? 401 : 409;
      return reply.code(code).send({ error: result.reason });
    }
    return reply.code(200).send(getPublicState());
  });

  app.post("/unlock", async (req, reply) => {
    const token = extractToken(req);
    const result = releaseLock(token);
    if (!result.ok) {
      const code = result.reason === "invalid_session" ? 401 : result.reason === "not_owner" ? 403 : 409;
      return reply.code(code).send({ error: result.reason });
    }
    return reply.code(200).send(getPublicState());
  });

  app.get("/me", async (req, reply) => {
    const token = extractToken(req);
    const valid = isSessionValid(token);
    return reply.code(200).send({ authenticated: valid });
  });
}

import Fastify from "fastify";
import cors from "@fastify/cors";
import { CORS_ORIGIN, HOST, PORT } from "./config.js";
import { runMigrations } from "./db/migrate.js";
import { ensureBathroomState, purge } from "./bathroom/logic.js";
import { HttpError } from "./errors.js";
import { registerAuthRoutes } from "./auth/routes.js";
import { registerBathroomRoutes } from "./bathroom/routes.js";
import { registerAdminRoutes } from "./admin/routes.js";
import { registerStatsRoutes } from "./stats/routes.js";
import { registerChatRoutes } from "./chat/routes.js";

const app = Fastify({ logger: true });

// Tolera POST sin body (lock/unlock/extend/join/leave) y POST con JSON (auth).
const tolerantParser = (
  req: unknown,
  payload: NodeJS.ReadableStream,
  done: (err: Error | null, body?: unknown) => void,
) => {
  const chunks: Buffer[] = [];
  payload.on("data", (chunk: Buffer) => chunks.push(chunk));
  payload.on("end", () => {
    const raw = Buffer.concat(chunks).toString("utf8");
    if (!raw) return done(null, null);
    try {
      done(null, JSON.parse(raw));
    } catch (err) {
      done(err as Error, undefined);
    }
  });
  payload.on("error", done);
};
app.addContentTypeParser("application/json", tolerantParser);
app.addContentTypeParser("*", tolerantParser);

await app.register(cors, {
  origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
});

app.setErrorHandler((err, _req, reply) => {
  if (err instanceof HttpError) {
    return reply.code(err.status).send({ error: err.code });
  }
  if ((err as { validation?: unknown }).validation) {
    return reply.code(400).send({ error: "invalid_body" });
  }
  app.log.error({ err }, "unhandled error");
  return reply.code(500).send({ error: "internal" });
});

await registerAuthRoutes(app);
registerBathroomRoutes(app);
registerAdminRoutes(app);
registerStatsRoutes(app);
await registerChatRoutes(app);

app.get("/health", async () => ({ status: "ok" }));

try {
  await runMigrations();
  await ensureBathroomState();
  app.log.info("DB ready: migrations applied, bathroom state ensured");
} catch (err) {
  app.log.error({ err }, "DB bootstrap failed");
  process.exit(1);
}

setInterval(() => {
  void purge();
}, 30_000);

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutting down");
  try {
    await app.close();
    process.exit(0);
  } catch (err) {
    app.log.error({ err }, "error during shutdown");
    process.exit(1);
  }
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

app
  .listen({ port: PORT, host: HOST })
  .then(() => {
    app.log.info(`Baño API ready on http://${HOST}:${PORT}`);
  })
  .catch((err) => {
    app.log.error({ err }, "failed to start");
    process.exit(1);
  });

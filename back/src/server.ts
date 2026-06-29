import Fastify from "fastify";
import cors from "@fastify/cors";
import { CORS_ORIGIN, HOST, PORT, QR_KEY } from "./config.js";
import { purge } from "./state.js";
import { registerRoutes } from "./routes.js";

const app = Fastify({ logger: true });

// Tolera POST sin body (lock/unlock) y POST con JSON (auth).
// Reemplaza el parser por defecto de application/json (que rechaza bodies vacíos)
// y registra un catch-all para cualquier otro content-type.
const tolerantParser = (req: unknown, payload: NodeJS.ReadableStream, done: (err: Error | null, body?: unknown) => void) => {
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
  methods: ["GET", "POST"],
  allowedHeaders: ["Authorization", "Content-Type"],
});

registerRoutes(app);

setInterval(() => purge(), 30_000);

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
    app.log.info(`QR link format: https://YOUR_DOMAIN/?k=${QR_KEY}`);
  })
  .catch((err) => {
    app.log.error({ err }, "failed to start");
    process.exit(1);
  });

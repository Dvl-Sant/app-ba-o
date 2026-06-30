import type { FastifyInstance } from "fastify";
import { getUser } from "../auth/middleware.js";
import { HttpError } from "../errors.js";
import { extendLock, getPublicState, joinQueue, leaveQueue, lock, unlock } from "./logic.js";

export function registerBathroomRoutes(app: FastifyInstance): void {
  app.get("/state", async () => getPublicState());

  app.post("/bathroom/lock", async (req) => {
    const u = getUser(req);
    if (!u) throw new HttpError(401, "unauthorized");
    return lock(u.sub);
  });

  app.post("/bathroom/unlock", async (req) => {
    const u = getUser(req);
    if (!u) throw new HttpError(401, "unauthorized");
    return unlock(u.sub, u.role === "admin");
  });

  app.post("/bathroom/extend", async (req) => {
    const u = getUser(req);
    if (!u) throw new HttpError(401, "unauthorized");
    return extendLock(u.sub);
  });

  app.post("/queue/join", async (req) => {
    const u = getUser(req);
    if (!u) throw new HttpError(401, "unauthorized");
    return joinQueue(u.sub);
  });

  app.post("/queue/leave", async (req) => {
    const u = getUser(req);
    if (!u) throw new HttpError(401, "unauthorized");
    return leaveQueue(u.sub);
  });
}

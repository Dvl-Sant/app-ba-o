import type { FastifyInstance } from "fastify";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { HttpError } from "../errors.js";
import { getUser, requireUser } from "./middleware.js";
import { hashPassword, verifyPassword } from "./password.js";
import { signToken } from "./jwt.js";
import type { UserRole } from "./jwt.js";
import { isAdmin } from "./roles.js";

const usernameRegex = /^[a-zA-Z0-9_.-]+$/;

const registerSchema = z.object({
  username: z.string().min(3).max(50).regex(usernameRegex, "invalid_username"),
  name: z.string().min(1).max(100),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const updateMeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).max(100).optional(),
});

const adminUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(["admin", "local", "visitante"]).optional(),
});

function toPublic(u: { id: string; username: string; name: string; role: string }) {
  return { id: u.id, username: u.username, name: u.name, role: u.role };
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/register", async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "invalid_body");
    const { username, name, password } = parsed.data;
    const usernameLower = username.toLowerCase();

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, usernameLower)).limit(1);
    if (existing.length) throw new HttpError(409, "username_taken");

    const passwordHash = await hashPassword(password);
    // Todos los registros nuevos son "visitante" por defecto.
    // El superadmin se promueve manualmente desde el panel admin.
    const role: UserRole = "visitante";

    const [created] = await db
      .insert(users)
      .values({ username: usernameLower, name, passwordHash, role })
      .returning();
    const token = signToken({ sub: created.id, username: created.username, name: created.name, role: created.role });
    return reply.code(201).send({ token, user: toPublic(created) });
  });

  app.post("/auth/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "invalid_body");
    const { username, password } = parsed.data;
    const [found] = await db.select().from(users).where(eq(users.username, username.toLowerCase())).limit(1);
    if (!found) throw new HttpError(401, "invalid_credentials");
    const ok = await verifyPassword(password, found.passwordHash);
    if (!ok) throw new HttpError(401, "invalid_credentials");
    const token = signToken({ sub: found.id, username: found.username, name: found.name, role: found.role });
    return reply.send({ token, user: toPublic(found) });
  });

  app.get("/auth/me", async (req, reply) => {
    const u = getUser(req);
    if (!u) throw new HttpError(401, "unauthorized");
    const [found] = await db.select().from(users).where(eq(users.id, u.sub)).limit(1);
    if (!found) throw new HttpError(401, "unauthorized");
    return reply.send({ user: toPublic(found) });
  });

  app.patch("/auth/me", async (req, reply) => {
    const u = requireUser(req);
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "invalid_body");
    const { name, currentPassword, newPassword } = parsed.data;
    const [found] = await db.select().from(users).where(eq(users.id, u.sub)).limit(1);
    if (!found) throw new HttpError(401, "unauthorized");

    const updates: { name?: string; passwordHash?: string } = {};
    if (name) updates.name = name;
    if (newPassword) {
      if (!currentPassword) throw new HttpError(400, "current_password_required");
      const ok = await verifyPassword(currentPassword, found.passwordHash);
      if (!ok) throw new HttpError(403, "invalid_current_password");
      updates.passwordHash = await hashPassword(newPassword);
    }
    if (Object.keys(updates).length === 0) throw new HttpError(400, "nothing_to_update");
    const [updated] = await db.update(users).set(updates).where(eq(users.id, u.sub)).returning();
    const token = signToken({ sub: updated.id, username: updated.username, name: updated.name, role: updated.role });
    return reply.send({ token, user: toPublic(updated) });
  });

  app.get("/users", async (req, reply) => {
    const u = requireUser(req);
    if (!isAdmin(u.role)) throw new HttpError(403, "admin_required");
    const rows = await db.select().from(users).orderBy(asc(users.createdAt));
    return reply.send({ users: rows.map(toPublic) });
  });

  app.patch<{ Params: { id: string } }>("/users/:id", async (req, reply) => {
    const u = requireUser(req);
    if (!isAdmin(u.role)) throw new HttpError(403, "admin_required");
    const parsed = adminUpdateSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "invalid_body");
    const { name, role } = parsed.data;
    // El superadmin no puede bajarse su propio rol (evita quedarse sin admin).
    if (role && role !== "admin" && req.params.id === u.sub) {
      throw new HttpError(409, "cannot_demote_self");
    }
    const updates: { name?: string; role?: UserRole } = {};
    if (name) updates.name = name;
    if (role) updates.role = role;
    if (Object.keys(updates).length === 0) throw new HttpError(400, "nothing_to_update");
    const [updated] = await db.update(users).set(updates).where(eq(users.id, req.params.id)).returning();
    if (!updated) throw new HttpError(404, "user_not_found");
    return reply.send({ user: toPublic(updated) });
  });

  app.delete<{ Params: { id: string } }>("/users/:id", async (req, reply) => {
    const u = requireUser(req);
    if (!isAdmin(u.role)) throw new HttpError(403, "admin_required");
    if (req.params.id === u.sub) throw new HttpError(409, "cannot_delete_self");
    await db.delete(users).where(eq(users.id, req.params.id));
    return reply.code(204).send();
  });
}

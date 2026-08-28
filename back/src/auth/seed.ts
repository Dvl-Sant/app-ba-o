import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { ADMIN_PASSWORD, ADMIN_USERNAME } from "../config.js";
import type { UserRole } from "./jwt.js";
import { hashPassword } from "./password.js";

/**
 * Seed inicial idempotente del usuario admin.
 *
 * En una BD nueva no existe ningun admin y el registro abierto solo crea
 * usuarios "visitante" (ver auth/routes.ts), asi que la instancia naceria
 * sin forma de administrarse: promover a admin requiere ser admin.
 *
 * Si no hay ningun usuario con rol admin, se crea ADMIN_USERNAME con
 * ADMIN_PASSWORD (default: DEFAULT_PASSWORD). Si ya existe un admin (o el
 * username ya esta tomado), no hace nada.
 *
 * @returns true si se creo el admin, false si ya habia uno.
 */
export async function ensureAdminUser(): Promise<boolean> {
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);
  if (admins.length > 0) return false;

  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  await db
    .insert(users)
    .values({
      username: ADMIN_USERNAME,
      name: "Administrador",
      passwordHash,
      role: "admin" as UserRole,
    })
    .onConflictDoNothing({ target: users.username });
  return true;
}

import type { UserRole } from "./jwt.js";

/**
 * Jerarquia numerica de roles. Mayor = mas permisos.
 * Permite comparar con isAtLeast(role, "local") etc. en lugar de
 * comparar strings sueltos por toda la codebase.
 */
export const ROLE_LEVEL: Record<UserRole, number> = {
  visitante: 0,
  local: 1,
  admin: 2,
};

/** true si `role` existe y tiene nivel >= `min`. */
export function isAtLeast(role: UserRole | string | undefined, min: UserRole): boolean {
  if (!role) return false;
  const level = ROLE_LEVEL[role as UserRole];
  return level !== undefined && level >= ROLE_LEVEL[min];
}

/** El chat y el ranking son solo para locales (y admin). */
export function canAccessChat(role: UserRole | string | undefined): boolean {
  return isAtLeast(role, "local");
}

export function canAccessRanking(role: UserRole | string | undefined): boolean {
  return isAtLeast(role, "local");
}

/** El superadmin (rol "admin"). Es el unico que gestiona usuarios y fuerza unlock. */
export function isAdmin(role: UserRole | string | undefined): boolean {
  return role === "admin";
}

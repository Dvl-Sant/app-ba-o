import type { UserRole } from "./types.js";

/**
 * Espejo del backend (back/src/auth/roles.ts).
 * Mantiene los gates de UI consistentes con los gates de API.
 */

/** El chat y el ranking son solo para locales (y superadmin). */
export function canAccessChat(role: UserRole | undefined): boolean {
  return role === "admin" || role === "local";
}

export function canAccessRanking(role: UserRole | undefined): boolean {
  return role === "admin" || role === "local";
}

/** El superadmin (rol "admin"): gestiona usuarios y entra al panel admin. */
export function isAdmin(role: UserRole | undefined): boolean {
  return role === "admin";
}

/** Etiqueta legible para mostrar el rol en la UI. */
export function roleLabel(role: UserRole): string {
  switch (role) {
    case "admin":
      return "Súperadmin";
    case "local":
      return "Local";
    case "visitante":
      return "Visitante";
  }
}

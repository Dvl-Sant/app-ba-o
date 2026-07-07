-- Agregar 'visitante' al enum user_role.
-- Debe ir antes del RENAME y no puede ejecutarse dentro de una transaccion,
-- por eso se separa en su propio statement.
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'visitante';
--> statement-breakpoint
-- Renombrar 'member' -> 'local'. Postgres actualiza los rows existentes
-- in-place via el catalogo, sin necesidad de UPDATE.
ALTER TYPE "user_role" RENAME VALUE 'member' TO 'local';
--> statement-breakpoint
-- Los nuevos registros seran 'visitante' por defecto.
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'visitante';

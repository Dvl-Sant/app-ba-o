-- Renombrar 'member' -> 'local'. Postgres actualiza los rows existentes
-- in-place via el catalogo (no reescribe la tabla).
ALTER TYPE "user_role" RENAME VALUE 'member' TO 'local';
--> statement-breakpoint
-- Los nuevos registros seran 'visitante' por defecto.
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'visitante';

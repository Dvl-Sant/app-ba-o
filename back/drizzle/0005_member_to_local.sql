-- Renombrar 'member' -> 'local' si aun existe (idempotente).
-- Postgres no soporta RENAME VALUE IF EXISTS, asi que lo verificamos via
-- pg_enum antes de ejecutarlo. Esto permite re-correr la migracion sin
-- error si ya se aplico parcialmente.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'member'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE "user_role" RENAME VALUE 'member' TO 'local';
  END IF;
END
$$;
--> statement-breakpoint
-- Los nuevos registros seran 'visitante' por defecto.
-- Idempotente: setear el mismo default no genera error.
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'visitante';

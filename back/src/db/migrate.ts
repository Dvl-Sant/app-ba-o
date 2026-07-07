import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { DATABASE_URL } from "../config.js";

/**
 * Aplica los cambios del enum user_role (member -> local + nuevo visitante)
 * fuera del migrador de Drizzle.
 *
 * Razon: el migrador de drizzle-orm/node-postgres envuelve TODAS las
 * migraciones en una unica transaccion global (ver PgDialect.migrate), y
 * Postgres no permite ALTER TYPE ... ADD VALUE dentro de una transaccion,
 * ni usar un valor recien anadido sin haberlo commiteado. El campo
 * "transaction": false del journal lo ignora el migrador runtime.
 *
 * Por eso ejecutamos estos statements a mano con un cliente pg puro, donde
 * cada query se auto-comitea. Todo es idempotente para poder re-correrlo.
 */
async function applyEnumMigration(client: pg.Client): Promise<void> {
  // 1. Agregar 'visitante' al enum (si no existe). Auto-commit.
  await client.query(`ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'visitante'`);

  // 2. Renombrar 'member' -> 'local' (si aun existe). Postgres no soporta
  //    RENAME VALUE IF EXISTS, asi que lo verificamos via pg_enum.
  await client.query(`
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
  `);

  // 3. Default de nuevos registros = 'visitante'. Idempotente.
  await client.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'visitante'`);
}

export async function runMigrations(): Promise<void> {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    // Primero los cambios de enum fuera de transaccion (ver doc arriba).
    await applyEnumMigration(client);
  } finally {
    await client.end();
  }

  // Despues el migrador de Drizzle para el resto de migraciones
  // (0000-0003, ya aplicadas en produccion -> no-op).
  const migrateClient = new pg.Client({ connectionString: DATABASE_URL });
  await migrateClient.connect();
  try {
    const migratorDb = drizzle(migrateClient);
    await migrate(migratorDb, { migrationsFolder: "./drizzle" });
  } finally {
    await migrateClient.end();
  }
}

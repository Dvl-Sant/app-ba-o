import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { DATABASE_URL } from "../config.js";

export async function runMigrations(): Promise<void> {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const migratorDb = drizzle(client);
    await migrate(migratorDb, { migrationsFolder: "./drizzle" });
  } finally {
    await client.end();
  }
}

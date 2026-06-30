import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { DATABASE_URL } from "../config.js";
import * as schema from "./schema.js";

export const pool = new pg.Pool({ connectionString: DATABASE_URL });
export const db = drizzle(pool, { schema });
export type Database = typeof db;

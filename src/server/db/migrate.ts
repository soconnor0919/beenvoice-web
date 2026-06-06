/**
 * Production migration runner. Applies any pending Drizzle migrations.
 * Run with: bun src/server/db/migrate.ts
 * Safe to run multiple times — Drizzle tracks applied migrations in drizzle.__drizzle_migrations.
 */
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[migrate] ERROR: DATABASE_URL is not set");
  process.exit(1);
}

const migrationsFolder = path.resolve(process.cwd(), "drizzle");

const pool = new Pool({
  connectionString: databaseUrl,
  ssl:
    process.env.DB_DISABLE_SSL === "true"
      ? false
      : { rejectUnauthorized: false },
  max: 1,
});

const db = drizzle(pool);

console.log("[migrate] Running migrations from", migrationsFolder);

try {
  await migrate(db, { migrationsFolder });
  console.log("[migrate] All migrations applied successfully");
} catch (err) {
  console.error("[migrate] Migration failed:", err);
  process.exit(1);
} finally {
  await pool.end();
}

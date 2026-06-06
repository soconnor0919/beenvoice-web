/**
 * Programmatic migration runner for production deployments.
 *
 * Run with: bun src/server/db/migrate.ts
 *
 * This applies any pending migrations from the drizzle/ directory to the
 * database specified by DATABASE_URL. It is safe to run multiple times —
 * Drizzle tracks applied migrations in the __drizzle_migrations table.
 *
 * If the database was previously set up via `db:push` (no migration history),
 * this script will baseline it: seed the migration history without re-running
 * the SQL, so only future migrations are applied.
 */
import * as dotenv from "dotenv";

// Load env files before importing anything that reads process.env
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import fs from "fs";
import crypto from "crypto";

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

/**
 * Verify and repair the migration tracking table:
 * 1. If no tracking table exists and DB has tables → baseline from db:push
 * 2. If tracking table exists → scan for any entries that are recorded as
 *    applied but whose schema changes don't actually exist, and remove them
 *    so migrate() will re-run those migrations.
 */
async function baselineIfNeeded(client: Pool) {
  const hasMigrationsTable = await tableExists(
    client,
    "drizzle",
    "__drizzle_migrations",
  );

  // Always ensure the drizzle schema + table exist
  await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  const { rows: entryRows } = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM drizzle.__drizzle_migrations`,
  );
  const hasEntries = parseInt(entryRows[0]?.count ?? "0") > 0;

  if (!hasMigrationsTable || !hasEntries) {
    // No history at all — check if DB was previously set up via db:push
    const dbAlreadyExists = await tableExists(
      client,
      "public",
      "beenvoice_account",
    );
    if (!dbAlreadyExists) {
      return; // Fresh DB — let migrate() run everything normally
    }

    console.log(
      "[migrate] Existing database detected without migration history — baselining...",
    );
    await seedMigrationHistory(client);
    return;
  }

  // Migration history exists — validate that each recorded migration is
  // actually reflected in the schema. Remove any bogus entries.
  await removeBogusEntries(client);
}

async function seedMigrationHistory(client: Pool) {
  const journal = JSON.parse(
    fs.readFileSync(path.join(migrationsFolder, "meta/_journal.json"), "utf8"),
  ) as { entries: { idx: number; tag: string; when: number }[] };

  for (const entry of journal.entries) {
    const applied = await isMigrationApplied(client, entry.tag);
    if (!applied) {
      console.log(`[migrate] Not yet in schema, will run: ${entry.tag}`);
      continue;
    }
    const sql = fs.readFileSync(
      path.join(migrationsFolder, `${entry.tag}.sql`),
      "utf8",
    );
    const hash = crypto.createHash("sha256").update(sql).digest("hex");
    await client.query(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
      [hash, entry.when],
    );
    console.log(`[migrate] Baselined: ${entry.tag}`);
  }
  console.log("[migrate] Baseline complete");
}

async function removeBogusEntries(client: Pool) {
  // Get all recorded hashes
  const { rows } = await client.query<{ id: number; hash: string }>(
    `SELECT id, hash FROM drizzle.__drizzle_migrations ORDER BY id`,
  );

  const journal = JSON.parse(
    fs.readFileSync(path.join(migrationsFolder, "meta/_journal.json"), "utf8"),
  ) as { entries: { idx: number; tag: string; when: number }[] };

  for (const entry of journal.entries) {
    const sql = fs.readFileSync(
      path.join(migrationsFolder, `${entry.tag}.sql`),
      "utf8",
    );
    const expectedHash = crypto.createHash("sha256").update(sql).digest("hex");
    const recorded = rows.find((r) => r.hash === expectedHash);
    if (!recorded) continue; // Not recorded yet — migrate() will run it

    // It's recorded — verify it's actually applied in the schema
    const applied = await isMigrationApplied(client, entry.tag);
    if (!applied) {
      console.log(
        `[migrate] Removing bogus migration record for: ${entry.tag}`,
      );
      await client.query(
        `DELETE FROM drizzle.__drizzle_migrations WHERE id = $1`,
        [recorded.id],
      );
    }
  }
}

async function tableExists(
  client: Pool,
  schema: string,
  table: string,
): Promise<boolean> {
  const { rows } = await client.query<{ count: string }>(
    `
    SELECT COUNT(*)::text AS count FROM information_schema.tables
    WHERE table_schema = $1 AND table_name = $2
  `,
    [schema, table],
  );
  return parseInt(rows[0]?.count ?? "0") > 0;
}

/**
 * Check whether a specific migration's schema changes already exist in the DB.
 */
async function isMigrationApplied(client: Pool, tag: string): Promise<boolean> {
  if (tag === "0000_glossy_magneto") {
    return tableExists(client, "public", "beenvoice_account");
  }
  if (tag === "0001_supreme_the_enforcers") {
    // 0001 adds currency to beenvoice_client
    const { rows } = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'beenvoice_client'
        AND column_name = 'currency'
    `);
    return parseInt(rows[0]?.count ?? "0") > 0;
  }
  if (tag === "0002_tax_deductible") {
    // 0002 adds taxDeductible to beenvoice_expense
    const { rows } = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'beenvoice_expense'
        AND column_name = 'taxDeductible'
    `);
    return parseInt(rows[0]?.count ?? "0") > 0;
  }
  if (tag === "0003_appearance_preferences") {
    // 0003 adds appearance preferences to beenvoice_user
    const { rows } = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'beenvoice_user'
        AND column_name = 'interfaceTheme'
    `);
    return parseInt(rows[0]?.count ?? "0") > 0;
  }
  if (tag === "0004_platform_appearance_controls") {
    // 0004 adds platform-level appearance controls to beenvoice_user
    const { rows } = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'beenvoice_user'
        AND column_name = 'sidebarStyle'
    `);
    return parseInt(rows[0]?.count ?? "0") > 0;
  }
  if (tag === "0005_platform_settings_and_roles") {
    const hasRole = await columnExists(
      client,
      "public",
      "beenvoice_user",
      "role",
    );
    const hasPlatformSettings = await tableExists(
      client,
      "public",
      "beenvoice_platform_setting",
    );
    return hasRole && hasPlatformSettings;
  }
  if (tag === "0006_pdf_generation_settings") {
    return columnExists(
      client,
      "public",
      "beenvoice_platform_setting",
      "pdfTemplate",
    );
  }
  if (tag === "0007_invoice_email_message") {
    return columnExists(client, "public", "beenvoice_invoice", "emailMessage");
  }
  if (tag === "0008_payments_recurring_public_links") {
    return columnExists(client, "public", "beenvoice_invoice", "publicToken");
  }
  if (tag === "0009_api_keys") {
    return tableExists(client, "public", "beenvoice_api_key");
  }
  if (tag === "0010_time_entries") {
    return tableExists(client, "public", "beenvoice_time_entry");
  }
  if (tag === "0011_time_entry_invoice_id") {
    return columnExists(client, "public", "beenvoice_time_entry", "invoiceId");
  }
  if (tag === "0012_verification_token_value_text") {
    const { rows } = await client.query<{ data_type: string }>(`
      SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'beenvoice_verification_token'
        AND column_name = 'value'
    `);
    return rows[0]?.data_type === "text";
  }
  // Unknown migration — assume not applied so it runs
  return false;
}

async function columnExists(
  client: Pool,
  schema: string,
  table: string,
  column: string,
): Promise<boolean> {
  const { rows } = await client.query<{ count: string }>(
    `
    SELECT COUNT(*)::text AS count FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
  `,
    [schema, table, column],
  );
  return parseInt(rows[0]?.count ?? "0") > 0;
}

console.log("[migrate] Running migrations from", migrationsFolder);

try {
  await baselineIfNeeded(pool);
  await migrate(db, { migrationsFolder });
  console.log("[migrate] All migrations applied successfully");
} catch (err) {
  console.error("[migrate] Migration failed:", err);
  process.exit(1);
} finally {
  await pool.end();
}

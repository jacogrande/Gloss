import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { Pool } from "pg";

const migrationsTableName = "_gloss_migrations";

type MigrationFile = {
  id: string;
  sql: string;
};

const compareMigrations = (
  left: MigrationFile,
  right: MigrationFile,
): number => left.id.localeCompare(right.id);

export const getMigrationsDirectory = (): string =>
  fileURLToPath(new URL("../../../../db/migrations", import.meta.url));

const listMigrationFiles = async (
  directory: string,
): Promise<MigrationFile[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const sqlFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map(async (entry) => ({
      id: entry.name,
      sql: await readFile(`${directory}/${entry.name}`, "utf8"),
    }));

  return (await Promise.all(sqlFiles)).sort(compareMigrations);
};

export const ensureMigrationsTable = async (pool: Pool): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${migrationsTableName} (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const getAppliedMigrationIds = async (pool: Pool): Promise<Set<string>> => {
  const result = await pool.query<{ id: string }>(
    `SELECT id FROM ${migrationsTableName}`,
  );

  return new Set(result.rows.map((row) => row.id));
};

const applyMigration = async (
  pool: Pool,
  migration: MigrationFile,
): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(migration.sql);
    await client.query(
      `INSERT INTO ${migrationsTableName} (id) VALUES ($1)`,
      [migration.id],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const applyMigrations = async (options: {
  directory?: string;
  pool: Pool;
}): Promise<{ applied: string[]; skipped: string[] }> => {
  const directory = options.directory ?? getMigrationsDirectory();

  await ensureMigrationsTable(options.pool);

  const appliedMigrationIds = await getAppliedMigrationIds(options.pool);
  const migrationFiles = await listMigrationFiles(directory);
  const applied: string[] = [];
  const skipped: string[] = [];

  for (const migration of migrationFiles) {
    if (appliedMigrationIds.has(migration.id)) {
      skipped.push(migration.id);
      continue;
    }

    await applyMigration(options.pool, migration);
    applied.push(migration.id);
  }

  return { applied, skipped };
};

export const resetDatabase = async (pool: Pool): Promise<void> => {
  await pool.query(`
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO CURRENT_USER;
    GRANT ALL ON SCHEMA public TO public;
  `);
};

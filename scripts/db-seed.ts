import { createDatabaseClient } from "../apps/api/src/lib/db";
import { ensureLocalDatabaseExists, ensureLocalPostgresStarted } from "../apps/api/src/lib/local-postgres";
import { applyMigrations } from "../apps/api/src/lib/migrations";
import { withPostgresAdvisoryLock } from "../apps/api/src/lib/postgres-lock";
import { resolveScriptEnv } from "./lib/env";
import { seedDatabase } from "./lib/seed";

const run = async (): Promise<void> => {
  const env = resolveScriptEnv();

  await ensureLocalPostgresStarted({ databaseUrl: env.DATABASE_URL });
  await ensureLocalDatabaseExists(env.DATABASE_URL);

  const database = createDatabaseClient(env.DATABASE_URL);

  try {
    const result = await withPostgresAdvisoryLock({
      key: env.DATABASE_URL,
      namespace: "gloss.local-database-admin",
      pool: database.pool,
      run: async () => {
        await applyMigrations({ pool: database.pool });

        return seedDatabase({ database, env });
      },
    });

    console.log(JSON.stringify(result));
  } finally {
    await database.pool.end();
  }
};

void run();

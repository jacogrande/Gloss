import { createDatabaseClient } from "../apps/api/src/lib/db";
import { ensureLocalDatabaseExists, ensureLocalPostgresStarted } from "../apps/api/src/lib/local-postgres";
import { applyMigrations, resetDatabase } from "../apps/api/src/lib/migrations";
import { resolveScriptEnv } from "./lib/env";
import { seedDatabase } from "./lib/seed";

const run = async (): Promise<void> => {
  const env = resolveScriptEnv();

  await ensureLocalPostgresStarted({ databaseUrl: env.DATABASE_URL });
  await ensureLocalDatabaseExists(env.DATABASE_URL);

  const database = createDatabaseClient(env.DATABASE_URL);

  try {
    await resetDatabase(database.pool);
    await applyMigrations({ pool: database.pool });
    const seedResult = await seedDatabase({ database, env });

    console.log(
      JSON.stringify({
        databaseUrl: env.DATABASE_URL,
        seedResult,
        status: "reset",
      }),
    );
  } finally {
    await database.pool.end();
  }
};

void run();

import { createDatabaseClient } from "./db";
import { loadServerEnvFromDotenv } from "./env";
import { ensureLocalDatabaseExists, ensureLocalPostgresStarted } from "./local-postgres";
import { applyMigrations } from "./migrations";

const run = async (): Promise<void> => {
  const env = loadServerEnvFromDotenv();

  await ensureLocalPostgresStarted({ databaseUrl: env.DATABASE_URL });
  await ensureLocalDatabaseExists(env.DATABASE_URL);

  const database = createDatabaseClient(env.DATABASE_URL);

  try {
    const result = await applyMigrations({ pool: database.pool });

    console.log(
      JSON.stringify({
        applied: result.applied,
        skipped: result.skipped,
      }),
    );
  } finally {
    await database.pool.end();
  }
};

void run();

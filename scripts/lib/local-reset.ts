import type { ServerEnv } from "@gloss/shared/env";

import { seedDatabase, type SeedResult } from "../../apps/api/src/lib/demo-seed";
import { createDatabaseClient } from "../../apps/api/src/lib/db";
import {
  ensureLocalDatabaseExists,
  ensureLocalPostgresStarted,
} from "../../apps/api/src/lib/local-postgres";
import {
  applyMigrations,
  resetDatabase,
} from "../../apps/api/src/lib/migrations";
import { withPostgresAdvisoryLock } from "../../apps/api/src/lib/postgres-lock";

export const resetLocalDatabase = async (env: ServerEnv): Promise<SeedResult> => {
  await ensureLocalPostgresStarted({ databaseUrl: env.DATABASE_URL });
  await ensureLocalDatabaseExists(env.DATABASE_URL);

  const database = createDatabaseClient(env.DATABASE_URL);

  try {
    return await withPostgresAdvisoryLock({
      key: env.DATABASE_URL,
      namespace: "gloss.local-database-admin",
      pool: database.pool,
      run: async () => {
        await resetDatabase(database.pool);
        await applyMigrations({ pool: database.pool });

        return seedDatabase({ database, env });
      },
    });
  } finally {
    await database.pool.end();
  }
};

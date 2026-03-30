import { derivePrivateAlphaReport } from "@gloss/shared/metrics";

import { createDatabaseClient } from "../apps/api/src/lib/db";
import {
  ensureLocalDatabaseExists,
  ensureLocalPostgresStarted,
} from "../apps/api/src/lib/local-postgres";
import { createProductEventService } from "../apps/api/src/services/product-event-service";
import { resolveScriptEnv } from "./lib/env";

const isLocalDatabaseUrl = (databaseUrl: string): boolean => {
  const hostname = new URL(databaseUrl).hostname;

  return hostname === "127.0.0.1" || hostname === "localhost";
};

const run = async (): Promise<void> => {
  const env = resolveScriptEnv();

  if (isLocalDatabaseUrl(env.DATABASE_URL)) {
    await ensureLocalPostgresStarted({
      databaseUrl: env.DATABASE_URL,
    });
    await ensureLocalDatabaseExists(env.DATABASE_URL);
  }

  const database = createDatabaseClient(env.DATABASE_URL);
  const productEventService = createProductEventService(database.db);

  try {
    const [events, seeds] = await Promise.all([
      productEventService.listEvents(),
      productEventService.listSeedSnapshots(),
    ]);
    const report = derivePrivateAlphaReport({
      events,
      generatedAt: new Date().toISOString(),
      seeds,
    });

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await database.pool.end();
  }
};

void run();

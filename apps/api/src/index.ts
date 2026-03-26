import { serve } from "@hono/node-server";

import { createApp } from "./app";
import { createAuth } from "./lib/auth";
import { createDatabaseClient } from "./lib/db";
import { loadServerEnvFromDotenv } from "./lib/env";
import { createLogger } from "./lib/logger";
import { createProfileService } from "./services/profile-service";

const env = loadServerEnvFromDotenv();
const logger = createLogger(env.LOG_LEVEL);
const database = createDatabaseClient(env.DATABASE_URL);
const profileService = createProfileService(database.db);
const auth = createAuth({
  env,
  logger,
  pool: database.pool,
  profileService,
});
const app = createApp({
  auth,
  env,
  logger,
  profileService,
});

const server = serve({
  fetch: app.fetch,
  hostname: "0.0.0.0",
  port: env.PORT,
});

logger.info("server.started", {
  apiOrigin: env.API_ORIGIN,
  port: env.PORT,
});

let shutdownPromise: Promise<void> | null = null;

const shutdown = async (): Promise<void> => {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  shutdownPromise = (async () => {
    server.close();
    await database.pool.end();
  })();

  await shutdownPromise;
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});

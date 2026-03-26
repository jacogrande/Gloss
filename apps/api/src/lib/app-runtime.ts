import type { ServerEnv } from "@gloss/shared/env";

import { createApp } from "../app";
import { createAuth, type GlossAuth } from "./auth";
import {
  createDatabaseClient,
  type DatabaseClient,
} from "./db";
import type { Logger } from "./logger";
import { createLogger } from "./logger";
import {
  createProfileService,
  type ProfileService,
} from "../services/profile-service";
import {
  createSeedService,
  type SeedService,
} from "../services/seed-service";

export type AppRuntime = {
  app: ReturnType<typeof createApp>;
  auth: GlossAuth;
  close: () => Promise<void>;
  database: DatabaseClient;
  env: ServerEnv;
  logger: Logger;
  profileService: ProfileService;
  seedService: SeedService;
};

export const createAppRuntime = (input: {
  database?: DatabaseClient;
  env: ServerEnv;
  logger?: Logger;
}): AppRuntime => {
  const database =
    input.database ?? createDatabaseClient(input.env.DATABASE_URL);
  const logger = input.logger ?? createLogger(input.env.LOG_LEVEL);
  const profileService = createProfileService(database.db);
  const seedService = createSeedService(database.db);
  const auth = createAuth({
    env: input.env,
    logger,
    pool: database.pool,
    profileService,
  });
  const app = createApp({
    auth,
    env: input.env,
    logger,
    profileService,
    seedService,
  });
  const ownsDatabase = input.database === undefined;

  let closePromise: Promise<void> | null = null;

  return {
    app,
    auth,
    close: async () => {
      if (closePromise) {
        return closePromise;
      }

      closePromise = ownsDatabase ? database.pool.end() : Promise.resolve();

      await closePromise;
    },
    database,
    env: input.env,
    logger,
    profileService,
    seedService,
  };
};

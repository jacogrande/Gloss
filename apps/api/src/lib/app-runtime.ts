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
  createDefaultEnrichmentService,
  type EnrichmentService,
} from "../services/enrichment-service";
import type { EnrichmentProviders } from "./enrichment-providers";
import {
  createProfileService,
  type ProfileService,
} from "../services/profile-service";
import {
  createDefaultRequestRateLimitService,
  type RequestRateLimitService,
} from "../services/request-rate-limit-service";
import {
  createDefaultReviewService,
  type ReviewService,
} from "../services/review-service";
import {
  createSeedService,
  type SeedService,
} from "../services/seed-service";
import type { RequestRateLimitPolicies } from "./request-rate-limit-contracts";

export type AppRuntime = {
  app: ReturnType<typeof createApp>;
  auth: GlossAuth;
  close: () => Promise<void>;
  database: DatabaseClient;
  enrichmentService: EnrichmentService;
  env: ServerEnv;
  logger: Logger;
  profileService: ProfileService;
  requestRateLimitService: RequestRateLimitService;
  reviewService: ReviewService;
  seedService: SeedService;
};

export const createAppRuntime = (input: {
  database?: DatabaseClient;
  enrichmentProviders?: EnrichmentProviders;
  env: ServerEnv;
  logger?: Logger;
  requestRateLimitPolicies?: RequestRateLimitPolicies;
  requestRateLimitService?: RequestRateLimitService;
}): AppRuntime => {
  const database =
    input.database ?? createDatabaseClient(input.env.DATABASE_URL);
  const logger = input.logger ?? createLogger(input.env.LOG_LEVEL);
  const requestRateLimitService =
    input.requestRateLimitService ??
    createDefaultRequestRateLimitService({
      db: database.db,
      logger,
      ...(input.requestRateLimitPolicies
        ? {
            policies: input.requestRateLimitPolicies,
          }
        : {}),
    });
  const profileService = createProfileService(database.db);
  const seedService = createSeedService(database.db);
  const enrichmentService = createDefaultEnrichmentService({
    db: database.db,
    env: input.env,
    logger,
    pool: database.pool,
    requestRateLimitService,
    ...(input.enrichmentProviders
      ? {
          providers: input.enrichmentProviders,
        }
      : {}),
  });
  const reviewService = createDefaultReviewService({
    database,
    env: input.env,
    logger,
    requestRateLimitService,
  });
  const auth = createAuth({
    env: input.env,
    logger,
    pool: database.pool,
    profileService,
  });
  const app = createApp({
    auth,
    enrichmentService,
    env: input.env,
    logger,
    profileService,
    requestRateLimitService,
    reviewService,
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
    enrichmentService,
    env: input.env,
    logger,
    profileService,
    requestRateLimitService,
    reviewService,
    seedService,
  };
};

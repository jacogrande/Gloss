import { createDatabaseClient } from "./src/lib/db";
import { loadServerEnv } from "./src/lib/env";
import { createLogger } from "./src/lib/logger";
import { createAuth } from "./src/lib/auth";
import { createProfileService } from "./src/services/profile-service";
import { createProductEventService } from "./src/services/product-event-service";

const env = loadServerEnv(process.env);
const logger = createLogger(env.LOG_LEVEL);
const database = createDatabaseClient(env.DATABASE_URL);
const profileService = createProfileService(database.db);
const productEventService = createProductEventService(database.db);

export const auth = createAuth({
  env,
  logger,
  pool: database.pool,
  productEventService,
  profileService,
});

export default auth;

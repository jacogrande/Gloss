import { createAuth } from "../../apps/api/src/lib/auth";
import type { DatabaseClient } from "../../apps/api/src/lib/db";
import { createLogger } from "../../apps/api/src/lib/logger";
import { createProfileService } from "../../apps/api/src/services/profile-service";
import type { ServerEnv } from "@gloss/shared/env";

type SeedResult = {
  createdDemoUser: boolean;
  demoEmail: string;
};

export const seedDatabase = async (options: {
  database: DatabaseClient;
  env: ServerEnv;
}): Promise<SeedResult> => {
  const demoEmail = "demo@gloss.local";
  const profileService = createProfileService(options.database.db);
  const auth = createAuth({
    env: options.env,
    logger: createLogger("error"),
    pool: options.database.pool,
    profileService,
  });
  const userQuery = await options.database.pool.query<{ id: string }>(
    'SELECT id FROM "user" WHERE email = $1 LIMIT 1',
    [demoEmail],
  );

  if (userQuery.rows.length > 0) {
    return {
      createdDemoUser: false,
      demoEmail,
    };
  }

  await auth.api.signUpEmail({
    body: {
      email: demoEmail,
      name: "Gloss Demo",
      password: "password1234",
    },
  });

  return {
    createdDemoUser: true,
    demoEmail,
  };
};

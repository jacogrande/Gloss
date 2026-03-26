import { createAuth } from "../../apps/api/src/lib/auth";
import type { DatabaseClient } from "../../apps/api/src/lib/db";
import { createLogger } from "../../apps/api/src/lib/logger";
import { createProfileService } from "../../apps/api/src/services/profile-service";
import { createSeedService } from "../../apps/api/src/services/seed-service";
import type { ServerEnv } from "@gloss/shared/env";

type SeedResult = {
  createdDemoUser: boolean;
  createdSeedCount: number;
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
  const seedService = createSeedService(options.database.db);
  const userQuery = await options.database.pool.query<{ id: string }>(
    'SELECT id FROM "user" WHERE email = $1 LIMIT 1',
    [demoEmail],
  );

  const userId =
    userQuery.rows[0]?.id ??
    (
      await auth.api.signUpEmail({
        body: {
          email: demoEmail,
          name: "Gloss Demo",
          password: "password1234",
        },
      })
    ).user.id;
  const existingSeedQuery = await options.database.pool.query<{ id: string }>(
    "SELECT id FROM seeds WHERE user_id = $1 LIMIT 1",
    [userId],
  );
  let createdSeedCount = 0;

  if (existingSeedQuery.rows.length === 0) {
    await seedService.createSeed({
      capture: {
        sentence:
          "The prose became unexpectedly lapidary by the final chapter.",
        source: {
          kind: "book",
          title: "Collected Essays",
        },
        word: "lapidary",
      },
      userId,
    });
    await seedService.createSeed({
      capture: {
        source: {
          kind: "article",
          title: "A Note on Serious Style",
          url: "https://example.com/serious-style",
        },
        word: "fastidious",
      },
      userId,
    });
    createdSeedCount = 2;
  }

  return {
    createdDemoUser: userQuery.rows.length === 0,
    createdSeedCount,
    demoEmail,
  };
};

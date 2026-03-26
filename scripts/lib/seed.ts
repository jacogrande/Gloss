import { createAppRuntime } from "../../apps/api/src/lib/app-runtime";
import type { DatabaseClient } from "../../apps/api/src/lib/db";
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
  const runtime = createAppRuntime({
    database: options.database,
    env: options.env,
  });
  const userQuery = await options.database.pool.query<{ id: string }>(
    'SELECT id FROM "user" WHERE email = $1 LIMIT 1',
    [demoEmail],
  );

  const userId =
    userQuery.rows[0]?.id ??
    (
      await runtime.auth.api.signUpEmail({
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
    await runtime.seedService.createSeed({
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
    await runtime.seedService.createSeed({
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

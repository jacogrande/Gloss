import type { ServerEnv } from "@gloss/shared/env";

import { createAppRuntime } from "./app-runtime";
import type { DatabaseClient } from "./db";

export type SeedResult = {
  createdDemoUser: boolean;
  createdSeedCount: number;
  demoEmail: string;
};

type DemoSeedDefinition = {
  capture: Parameters<
    ReturnType<typeof createAppRuntime>["seedService"]["createSeed"]
  >[0]["capture"];
  normalizedWord: string;
};

const demoSeedDefinitions: DemoSeedDefinition[] = [
  {
    capture: {
      sentence: "The prose became unexpectedly lapidary by the final chapter.",
      source: {
        kind: "book",
        title: "Collected Essays",
      },
      word: "lapidary",
    },
    normalizedWord: "lapidary",
  },
  {
    capture: {
      source: {
        kind: "article",
        title: "A Note on Serious Style",
        url: "https://example.com/serious-style",
      },
      word: "fastidious",
    },
    normalizedWord: "fastidious",
  },
];

export const demoSeedCount = demoSeedDefinitions.length;

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
  const existingSeedQuery = await options.database.pool.query<{
    id: string;
    normalized_word: string;
  }>(
    `
      SELECT s.id, s.normalized_word
      FROM seeds s
      WHERE s.user_id = $1
        AND s.normalized_word = ANY($2::text[])
    `,
    [
      userId,
      demoSeedDefinitions.map((definition) => definition.normalizedWord),
    ],
  );
  let createdSeedCount = 0;
  const seedIdByNormalizedWord = new Map(
    existingSeedQuery.rows.map((row) => [row.normalized_word, row.id]),
  );

  for (const definition of demoSeedDefinitions) {
    if (seedIdByNormalizedWord.has(definition.normalizedWord)) {
      continue;
    }

    const createdSeed = await runtime.seedService.createSeed({
      capture: definition.capture,
      userId,
    });

    seedIdByNormalizedWord.set(definition.normalizedWord, createdSeed.id);
    createdSeedCount += 1;
  }

  const enrichmentQuery = await options.database.pool.query<{
    seed_id: string;
    status: string;
  }>(
    `
      SELECT seed_id, status
      FROM seed_enrichments
      WHERE user_id = $1
        AND seed_id = ANY($2::text[])
    `,
    [userId, Array.from(seedIdByNormalizedWord.values())],
  );
  const enrichmentStatusBySeedId = new Map(
    enrichmentQuery.rows.map((row) => [row.seed_id, row.status]),
  );

  for (const seedId of seedIdByNormalizedWord.values()) {
    if (enrichmentStatusBySeedId.get(seedId) === "ready") {
      continue;
    }

    await runtime.enrichmentService.requestSeedEnrichment({
      seedId,
      userId,
    });
  }

  return {
    createdDemoUser: userQuery.rows.length === 0,
    createdSeedCount,
    demoEmail,
  };
};

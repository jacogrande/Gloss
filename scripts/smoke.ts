import {
  createSeedResponseSchema,
  seedDetailResponseSchema,
  seedListResponseSchema,
  sessionResponseSchema,
} from "@gloss/shared/contracts";

import { createApp } from "../apps/api/src/app";
import { createAuth } from "../apps/api/src/lib/auth";
import { createDatabaseClient } from "../apps/api/src/lib/db";
import { ensureLocalDatabaseExists, ensureLocalPostgresStarted } from "../apps/api/src/lib/local-postgres";
import { createLogger } from "../apps/api/src/lib/logger";
import { applyMigrations, resetDatabase } from "../apps/api/src/lib/migrations";
import { createProfileService } from "../apps/api/src/services/profile-service";
import { createSeedService } from "../apps/api/src/services/seed-service";
import { resolveScriptEnv } from "./lib/env";

const extractCookies = (response: Response): string => {
  const header =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie().join("; ")
      : response.headers.get("set-cookie");

  if (!header) {
    throw new Error("Expected smoke auth response to include a session cookie.");
  }

  return header
    .split(/,(?=[^;]+?=)/)
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter((cookie): cookie is string => Boolean(cookie))
    .join("; ");
};

const run = async (): Promise<void> => {
  const env = resolveScriptEnv();

  await ensureLocalPostgresStarted({ databaseUrl: env.DATABASE_URL });
  await ensureLocalDatabaseExists(env.DATABASE_URL);

  const database = createDatabaseClient(env.DATABASE_URL);

  try {
    await resetDatabase(database.pool);
    await applyMigrations({ pool: database.pool });

    const profileService = createProfileService(database.db);
    const seedService = createSeedService(database.db);
    const auth = createAuth({
      env,
      logger: createLogger("error"),
      pool: database.pool,
      profileService,
    });
    const app = createApp({
      auth,
      env,
      logger: createLogger("error"),
      profileService,
      seedService,
    });

    const signUpResponse = await app.request(
      "http://127.0.0.1:8787/api/auth/sign-up/email",
      {
        body: JSON.stringify({
          email: "smoke@gloss.local",
          name: "Smoke User",
          password: "password1234",
        }),
        headers: {
          "content-type": "application/json",
          origin: env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const cookie = extractCookies(signUpResponse);
    const createSeedResponse = await app.request(
      "http://127.0.0.1:8787/capture/seeds",
      {
        body: JSON.stringify({
          sentence:
            "The prose became unexpectedly lapidary by the final chapter.",
          source: {
            kind: "book",
            title: "Collected Essays",
          },
          word: "lapidary",
        }),
        headers: {
          "content-type": "application/json",
          cookie,
          origin: env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const createSeedBody = createSeedResponseSchema.parse(
      (await createSeedResponse.json()) as unknown,
    );
    const createdSeedId = createSeedBody.data.id;
    const listResponse = await app.request("http://127.0.0.1:8787/seeds", {
      headers: {
        cookie,
        origin: env.WEB_ORIGIN,
      },
    });
    const listBody = seedListResponseSchema.parse(
      (await listResponse.json()) as unknown,
    );
    const detailResponse = await app.request(
      `http://127.0.0.1:8787/seeds/${createdSeedId}`,
      {
        headers: {
          cookie,
          origin: env.WEB_ORIGIN,
        },
      },
    );
    const detailBody = seedDetailResponseSchema.parse(
      (await detailResponse.json()) as unknown,
    );
    const meResponse = await app.request("http://127.0.0.1:8787/api/me", {
      headers: {
        cookie,
        origin: env.WEB_ORIGIN,
      },
    });
    const meBody = sessionResponseSchema.parse((await meResponse.json()) as unknown);

    if (
      signUpResponse.status !== 200 ||
      createSeedResponse.status !== 201 ||
      listResponse.status !== 200 ||
      detailResponse.status !== 200 ||
      meResponse.status !== 200
    ) {
      throw new Error(
        `Smoke failed with statuses signUp=${signUpResponse.status} create=${createSeedResponse.status} list=${listResponse.status} detail=${detailResponse.status} me=${meResponse.status}`,
      );
    }

    if (
      createSeedBody.data.source?.title !== "Collected Essays" ||
      listBody.data.items[0]?.source?.title !== "Collected Essays" ||
      detailBody.data.source?.title !== "Collected Essays"
    ) {
      throw new Error("Smoke failed to preserve source metadata across create, list, and detail flows.");
    }

    console.log(
      JSON.stringify({
        createSeedBody,
        createSeedStatus: createSeedResponse.status,
        detailBody,
        detailStatus: detailResponse.status,
        listBody,
        listStatus: listResponse.status,
        meBody,
        meStatus: meResponse.status,
        signUpStatus: signUpResponse.status,
        status: "passed",
      }),
    );
  } finally {
    await database.pool.end();
  }
};

void run();

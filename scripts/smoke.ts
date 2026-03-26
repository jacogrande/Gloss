import { createApp } from "../apps/api/src/app";
import { createAuth } from "../apps/api/src/lib/auth";
import { createDatabaseClient } from "../apps/api/src/lib/db";
import { ensureLocalDatabaseExists, ensureLocalPostgresStarted } from "../apps/api/src/lib/local-postgres";
import { createLogger } from "../apps/api/src/lib/logger";
import { applyMigrations, resetDatabase } from "../apps/api/src/lib/migrations";
import { createProfileService } from "../apps/api/src/services/profile-service";
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
    const meResponse = await app.request("http://127.0.0.1:8787/api/me", {
      headers: {
        cookie,
        origin: env.WEB_ORIGIN,
      },
    });
    const meBody: unknown = await meResponse.json();

    if (signUpResponse.status !== 200 || meResponse.status !== 200) {
      throw new Error(
        `Smoke failed with statuses signUp=${signUpResponse.status} me=${meResponse.status}`,
      );
    }

    console.log(
      JSON.stringify({
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

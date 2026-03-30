import { createAppRuntime } from "../src/lib/app-runtime";
import { createDatabaseClient } from "../src/lib/db";
import { loadServerEnv } from "../src/lib/env";
import type { EnrichmentProviders } from "../src/lib/enrichment-providers";
import { ensureLocalDatabaseExists, ensureLocalPostgresStarted } from "../src/lib/local-postgres";
import { applyMigrations, resetDatabase } from "../src/lib/migrations";
import type { RequestRateLimitPolicies } from "../src/lib/request-rate-limit-contracts";

const defaultDatabaseUrl = "postgresql://gloss:gloss@127.0.0.1:54329/gloss";

const deriveTestDatabaseUrl = (databaseUrl: string): string => {
  const url = new URL(databaseUrl);
  const databaseName = url.pathname.replace(/^\//, "");

  url.pathname = `/${databaseName}_test`;

  return url.toString();
};

export type TestContext = {
  app: ReturnType<typeof createAppRuntime>["app"];
  database: ReturnType<typeof createDatabaseClient>;
  env: ReturnType<typeof loadServerEnv>;
  runtime: ReturnType<typeof createAppRuntime>;
};

export const createTestContext = async (input?: {
  enrichmentProviders?: EnrichmentProviders;
  requestRateLimitPolicies?: RequestRateLimitPolicies;
}): Promise<TestContext> => {
  const testDatabaseUrl = deriveTestDatabaseUrl(
    process.env.DATABASE_URL ?? defaultDatabaseUrl,
  );

  await ensureLocalPostgresStarted({ databaseUrl: testDatabaseUrl });
  await ensureLocalDatabaseExists(testDatabaseUrl);

  const env = loadServerEnv({
    API_ORIGIN: "http://127.0.0.1:8787",
    BETTER_AUTH_SECRET: "test-secret-for-gloss",
    BETTER_AUTH_URL: "http://127.0.0.1:8787",
    DATABASE_URL: testDatabaseUrl,
    LOG_LEVEL: "error",
    NODE_ENV: "test",
    PORT: "8787",
    WEB_ORIGIN: "http://127.0.0.1:5173",
  });
  const database = createDatabaseClient(env.DATABASE_URL);

  await resetDatabase(database.pool);
  await applyMigrations({ pool: database.pool });

  const runtime = createAppRuntime({
    database,
    env,
    ...(input?.enrichmentProviders
      ? {
          enrichmentProviders: input.enrichmentProviders,
        }
      : {}),
    ...(input?.requestRateLimitPolicies
      ? {
          requestRateLimitPolicies: input.requestRateLimitPolicies,
        }
      : {}),
  });

  return {
    app: runtime.app,
    database,
    env,
    runtime,
  };
};

export const extractCookies = (response: Response): string => {
  const header =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie().join("; ")
      : response.headers.get("set-cookie");

  if (!header) {
    throw new Error("Expected auth response to include a Set-Cookie header.");
  }

  return header
    .split(/,(?=[^;]+?=)/)
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter((cookie): cookie is string => Boolean(cookie))
    .join("; ");
};

export const signUpTestUser = async (input: {
  app: TestContext["app"];
  email: string;
  env: TestContext["env"];
  name: string;
  password?: string;
}): Promise<string> => {
  const response = await input.app.request(
    "http://127.0.0.1:8787/api/auth/sign-up/email",
    {
      body: JSON.stringify({
        email: input.email,
        name: input.name,
        password: input.password ?? "password1234",
      }),
      headers: {
        "content-type": "application/json",
        origin: input.env.WEB_ORIGIN,
      },
      method: "POST",
    },
  );

  if (response.status !== 200) {
    throw new Error(
      `Failed to sign up test user ${input.email}: ${response.status} ${await response.text()}`,
    );
  }

  return extractCookies(response);
};

export const signInTestUser = async (input: {
  app: TestContext["app"];
  email: string;
  env: TestContext["env"];
  password?: string;
}): Promise<string> => {
  const response = await input.app.request(
    "http://127.0.0.1:8787/api/auth/sign-in/email",
    {
      body: JSON.stringify({
        email: input.email,
        password: input.password ?? "password1234",
      }),
      headers: {
        "content-type": "application/json",
        origin: input.env.WEB_ORIGIN,
      },
      method: "POST",
    },
  );

  if (response.status !== 200) {
    throw new Error(`Failed to sign in test user ${input.email}.`);
  }

  return extractCookies(response);
};

export const signOutTestUser = async (input: {
  app: TestContext["app"];
  cookie: string;
  env: TestContext["env"];
}): Promise<Response> =>
  input.app.request("http://127.0.0.1:8787/api/auth/sign-out", {
    headers: {
      cookie: input.cookie,
      origin: input.env.WEB_ORIGIN,
    },
    method: "POST",
  });

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import { applyMigrations, resetDatabase } from "../src/lib/migrations";

import { seedDatabase } from "../../../scripts/lib/seed";
import {
  createTestContext,
  signInTestUser,
  type TestContext,
} from "./helpers";

type CountRow = {
  count: string;
};

let context: TestContext;

const countDemoUsers = async (): Promise<number> => {
  const result = await context.database.pool.query<CountRow>(
    'SELECT COUNT(*)::text AS count FROM "user" WHERE email = $1',
    ["demo@gloss.local"],
  );

  return Number(result.rows[0]?.count ?? "0");
};

const countDemoSeeds = async (): Promise<number> => {
  const result = await context.database.pool.query<CountRow>(
    `
      SELECT COUNT(*)::text AS count
      FROM seeds
      WHERE user_id = (
        SELECT id
        FROM "user"
        WHERE email = $1
        LIMIT 1
      )
    `,
    ["demo@gloss.local"],
  );

  return Number(result.rows[0]?.count ?? "0");
};

const expectDemoSignInReady = async (): Promise<void> => {
  const cookie = await signInTestUser({
    app: context.app,
    email: "demo@gloss.local",
    env: context.env,
  });

  expect(cookie).toContain("better-auth.session_token");
};

describe("local harness reset integration", () => {
  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await context?.database.pool.end();
  });

  it("seeds the demo account idempotently without duplicate users or seeds", async () => {
    const first = await seedDatabase({
      database: context.database,
      env: context.env,
    });
    const second = await seedDatabase({
      database: context.database,
      env: context.env,
    });

    expect(first.demoEmail).toBe("demo@gloss.local");
    expect(first.createdDemoUser).toBe(true);
    expect(first.createdSeedCount).toBeGreaterThan(0);
    expect(second.demoEmail).toBe("demo@gloss.local");
    expect(second.createdDemoUser).toBe(false);
    expect(second.createdSeedCount).toBe(0);
    expect(await countDemoUsers()).toBe(1);
    expect(await countDemoSeeds()).toBe(2);
    await expectDemoSignInReady();
  });

  it("keeps repeated reset-and-seed cycles sign-in ready", async () => {
    for (let iteration = 0; iteration < 2; iteration += 1) {
      await resetDatabase(context.database.pool);
      await applyMigrations({ pool: context.database.pool });

      await seedDatabase({
        database: context.database,
        env: context.env,
      });
    }

    expect(await countDemoUsers()).toBe(1);
    expect(await countDemoSeeds()).toBe(2);
    await expectDemoSignInReady();
  });
});

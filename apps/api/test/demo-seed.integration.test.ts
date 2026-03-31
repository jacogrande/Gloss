import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import { demoSeedCount, seedDatabase } from "../src/lib/demo-seed";
import {
  createTestContext,
  signInTestUser,
  type TestContext,
} from "./helpers";

type CountRow = {
  count: string;
};

const countDemoUsers = async (context: TestContext): Promise<number> => {
  const result = await context.database.pool.query<CountRow>(
    'SELECT COUNT(*)::text AS count FROM "user" WHERE email = $1',
    ["demo@gloss.local"],
  );

  return Number(result.rows[0]?.count ?? "0");
};

const countDemoSeeds = async (context: TestContext): Promise<number> => {
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

describe("demo seed integration", () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await context?.database.pool.end();
  });

  it("seeds the demo account idempotently and preserves sign-in", async () => {
    const firstResult = await seedDatabase({
      database: context.database,
      env: context.env,
    });
    const secondResult = await seedDatabase({
      database: context.database,
      env: context.env,
    });

    expect(firstResult.createdDemoUser).toBe(true);
    expect(firstResult.createdSeedCount).toBe(demoSeedCount);
    expect(secondResult.createdDemoUser).toBe(false);
    expect(secondResult.createdSeedCount).toBe(0);
    await expect(
      signInTestUser({
        app: context.app,
        email: "demo@gloss.local",
        env: context.env,
      }),
    ).resolves.toContain("better-auth.session_token");
    await expect(countDemoUsers(context)).resolves.toBe(1);
    await expect(countDemoSeeds(context)).resolves.toBe(demoSeedCount);
  });
});

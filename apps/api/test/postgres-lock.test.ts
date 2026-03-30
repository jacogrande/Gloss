import { describe, expect, it } from "vitest";

import { withPostgresAdvisoryLock } from "../src/lib/postgres-lock";

type FakeQueryResult = {
  rows: Array<{ acquired?: boolean }>;
};

type FakeClient = {
  queries: Array<{
    params: unknown[];
    sql: string;
  }>;
  releaseCount: number;
};

const createLockClient = (input: {
  acquired: boolean[];
}): {
  client: FakeClient;
  pool: {
    connect: () => Promise<{
      query: (sql: string, params: unknown[]) => Promise<FakeQueryResult>;
      release: () => void;
    }>;
  };
} => {
  const client: FakeClient = {
    queries: [],
    releaseCount: 0,
  };
  let attemptIndex = 0;

  return {
    client,
    pool: {
      connect: () => Promise.resolve({
        query: (sql: string, params: unknown[]): Promise<FakeQueryResult> => {
          client.queries.push({ params, sql });

          if (sql.includes("pg_try_advisory_lock")) {
            const acquired = input.acquired[attemptIndex] ?? false;

            attemptIndex += 1;

            return Promise.resolve({
              rows: [{ acquired }],
            });
          }

          return Promise.resolve({
            rows: [],
          });
        },
        release: (): void => {
          client.releaseCount += 1;
        },
      }),
    },
  };
};

describe("withPostgresAdvisoryLock", () => {
  it("releases unsuccessful lock attempts before retrying", async () => {
    const { client, pool } = createLockClient({
      acquired: [false, true],
    });
    const result = await withPostgresAdvisoryLock({
      key: "same-seed",
      namespace: "seed.enrichment.request",
      pollIntervalMs: 0,
      pool: pool as never,
      run: (): Promise<string> => Promise.resolve("locked"),
      timeoutMs: 1_000,
    });

    expect(result).toBe("locked");
    expect(client.releaseCount).toBe(2);
    expect(
      client.queries.filter((query) => query.sql.includes("pg_try_advisory_lock"))
        .length,
    ).toBe(2);
    expect(
      client.queries.some((query) => query.sql.includes("pg_advisory_unlock")),
    ).toBe(true);
  });
});

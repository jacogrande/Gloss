import type { Pool } from "pg";

const hashLockKey = (value: string): number => {
  let hash = 0;

  for (const character of value) {
    hash = Math.imul(hash, 31) + character.charCodeAt(0);
    hash |= 0;
  }

  return hash;
};

export const withPostgresAdvisoryLock = async <TValue>(input: {
  key: string;
  namespace: string;
  pollIntervalMs?: number;
  pool: Pool;
  run: () => Promise<TValue>;
  timeoutMs?: number;
}): Promise<TValue> => {
  const namespaceKey = hashLockKey(input.namespace);
  const resourceKey = hashLockKey(input.key);
  const pollIntervalMs = input.pollIntervalMs ?? 50;
  const timeoutMs = input.timeoutMs ?? 30_000;
  const startedAt = Date.now();

  while (true) {
    const client = await input.pool.connect();
    let released = false;
    const releaseClient = (): void => {
      if (released) {
        return;
      }

      released = true;
      client.release();
    };

    try {
      const result = await client.query<{ acquired: boolean }>(
        "SELECT pg_try_advisory_lock($1, $2) AS acquired",
        [namespaceKey, resourceKey],
      );
      const acquired = result.rows[0]?.acquired === true;

      if (!acquired) {
        if (Date.now() - startedAt >= timeoutMs) {
          throw new Error(
            `Timed out waiting for advisory lock ${input.namespace}:${input.key}.`,
          );
        }

        releaseClient();
        await new Promise((resolve) => {
          setTimeout(resolve, pollIntervalMs);
        });
        continue;
      }

      try {
        return await input.run();
      } finally {
        try {
          await client.query("SELECT pg_advisory_unlock($1, $2)", [
            namespaceKey,
            resourceKey,
          ]);
        } finally {
          releaseClient();
        }
      }
    } catch (error) {
      releaseClient();

      throw error;
    }
  }
};

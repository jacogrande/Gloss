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
  pool: Pool;
  run: () => Promise<TValue>;
}): Promise<TValue> => {
  const client = await input.pool.connect();
  const namespaceKey = hashLockKey(input.namespace);
  const resourceKey = hashLockKey(input.key);

  try {
    await client.query("SELECT pg_advisory_lock($1, $2)", [
      namespaceKey,
      resourceKey,
    ]);

    return await input.run();
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock($1, $2)", [
        namespaceKey,
        resourceKey,
      ]);
    } finally {
      client.release();
    }
  }
};

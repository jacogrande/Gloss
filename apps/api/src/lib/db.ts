import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "../db/schema";

export type GlossDatabase = NodePgDatabase<typeof schema>;

export type DatabaseClient = {
  db: GlossDatabase;
  pool: Pool;
};

export const createDatabaseClient = (
  connectionString: string,
): DatabaseClient => {
  const pool = new Pool({
    connectionString,
    max: 10,
  });

  return {
    db: drizzle(pool, { schema }),
    pool,
  };
};

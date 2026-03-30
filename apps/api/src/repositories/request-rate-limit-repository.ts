import { lt, sql } from "drizzle-orm";

import {
  requestRateLimitsTable,
  type RequestRateLimitRow,
} from "../db/schema";
import type { GlossDatabase } from "../lib/db";

export type RequestRateLimitRepository = {
  consume: (input: {
    actorKey: string;
    now: Date;
    policyKey: string;
    windowSeconds: number;
    windowStartedAt: Date;
  }) => Promise<RequestRateLimitRow>;
  pruneExpired: (input: { olderThan: Date }) => Promise<number>;
};

const requireRow = <TRow>(row: TRow | undefined, message: string): TRow => {
  if (!row) {
    throw new Error(message);
  }

  return row;
};

export const createRequestRateLimitRepository = (
  db: GlossDatabase,
): RequestRateLimitRepository => ({
  async consume(input) {
    const [row] = await db
      .insert(requestRateLimitsTable)
      .values({
        actorKey: input.actorKey,
        id: crypto.randomUUID(),
        policyKey: input.policyKey,
        requestCount: 1,
        updatedAt: input.now,
        windowSeconds: input.windowSeconds,
        windowStartedAt: input.windowStartedAt,
      })
      .onConflictDoUpdate({
        set: {
          requestCount: sql`${requestRateLimitsTable.requestCount} + 1`,
          updatedAt: input.now,
        },
        target: [
          requestRateLimitsTable.actorKey,
          requestRateLimitsTable.policyKey,
          requestRateLimitsTable.windowStartedAt,
        ],
      })
      .returning();

    return requireRow(row, "Request rate limit row was not returned.");
  },
  async pruneExpired(input) {
    const deletedRows = await db
      .delete(requestRateLimitsTable)
      .where(lt(requestRateLimitsTable.updatedAt, input.olderThan))
      .returning({ id: requestRateLimitsTable.id });

    return deletedRows.length;
  },
});

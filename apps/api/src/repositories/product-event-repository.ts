import {
  and,
  desc,
  eq,
} from "drizzle-orm";

import type {
  ProductEvent,
  ProductEventType,
} from "@gloss/shared/types";

import {
  productEventsTable,
  seedsTable,
  type ProductEventRow,
} from "../db/schema";
import type { GlossDatabase } from "../lib/db";

type ProductEventInsert = ProductEvent & {
  id: string;
};

export type ProductEventRepository = {
  insert: (input: ProductEventInsert) => Promise<ProductEventRow>;
  list: (input?: {
    limit?: number;
    schemaVersion?: string;
    type?: ProductEventType;
  }) => Promise<ProductEventRow[]>;
  listSeedSnapshots: () => Promise<
    Array<{
      createdAt: Date;
      id: string;
      stage: typeof seedsTable.$inferSelect.stage;
      userId: string;
    }>
  >;
};

export const createProductEventRepository = (
  db: GlossDatabase,
): ProductEventRepository => ({
  async insert(input) {
    const [created] = await db
      .insert(productEventsTable)
      .values({
        actorTag: input.actorTag,
        id: input.id,
        occurredAt: new Date(input.occurredAt),
        payload: input.payload,
        reviewSessionId: "reviewSessionId" in input ? input.reviewSessionId : null,
        schemaVersion: input.schemaVersion,
        seedId: "seedId" in input ? input.seedId : null,
        sessionId: "sessionId" in input ? input.sessionId : null,
        type: input.type,
        userId: "userId" in input ? input.userId : null,
      })
      .returning();

    if (!created) {
      throw new Error("Product event insert did not return a row.");
    }

    return created;
  },
  async list(input) {
    if (input?.type && input?.schemaVersion) {
      const query = db
        .select()
        .from(productEventsTable)
        .where(
          and(
            eq(productEventsTable.type, input.type),
            eq(productEventsTable.schemaVersion, input.schemaVersion),
          ),
        )
        .orderBy(desc(productEventsTable.occurredAt));

      return input.limit === undefined ? query : query.limit(input.limit);
    }

    if (input?.type) {
      const query = db
        .select()
        .from(productEventsTable)
        .where(eq(productEventsTable.type, input.type))
        .orderBy(desc(productEventsTable.occurredAt));

      return input?.limit === undefined ? query : query.limit(input.limit);
    }

    if (input?.schemaVersion) {
      const query = db
        .select()
        .from(productEventsTable)
        .where(eq(productEventsTable.schemaVersion, input.schemaVersion))
        .orderBy(desc(productEventsTable.occurredAt));

      return input.limit === undefined ? query : query.limit(input.limit);
    }

    const query = db
      .select()
      .from(productEventsTable)
      .orderBy(desc(productEventsTable.occurredAt));

    return input?.limit === undefined ? query : query.limit(input.limit);
  },
  async listSeedSnapshots() {
    return db
      .select({
        createdAt: seedsTable.createdAt,
        id: seedsTable.id,
        stage: seedsTable.stage,
        userId: seedsTable.userId,
      })
      .from(seedsTable);
  },
});

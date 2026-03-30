import {
  productEventSchemaVersion,
  productEventSchema,
} from "@gloss/shared/contracts";
import type {
  ProductEvent,
  ProductEventType,
  SeedStage,
} from "@gloss/shared/types";

import type { GlossDatabase } from "../lib/db";
import {
  createProductEventRepository,
  type ProductEventRepository,
} from "../repositories/product-event-repository";

export type ProductEventService = {
  listEvents: (input?: {
    limit?: number;
    type?: ProductEventType;
  }) => Promise<ProductEvent[]>;
  listSeedSnapshots: () => Promise<
    Array<{
      createdAt: string;
      id: string;
      stage: SeedStage;
      userId: string;
    }>
  >;
  record: (input: ProductEvent) => Promise<void>;
};

const toPersistedProductEvent = (input: ProductEvent): ProductEvent & {
  id: string;
} => ({
  ...productEventSchema.parse(input),
  id: crypto.randomUUID(),
});

const toProductEvent = (
  input: Awaited<ReturnType<ProductEventRepository["list"]>>[number],
): ProductEvent =>
  productEventSchema.parse({
    actorTag: input.actorTag,
    occurredAt: input.occurredAt.toISOString(),
    ...(input.reviewSessionId
      ? {
          reviewSessionId: input.reviewSessionId,
        }
      : {}),
    schemaVersion: input.schemaVersion,
    ...(input.seedId
      ? {
          seedId: input.seedId,
        }
      : {}),
    ...(input.sessionId
      ? {
          sessionId: input.sessionId,
        }
      : {}),
    type: input.type,
    ...(input.userId
      ? {
          userId: input.userId,
        }
      : {}),
    payload: input.payload,
  });

export const createProductEventService = (
  db: GlossDatabase,
  repository: ProductEventRepository = createProductEventRepository(db),
): ProductEventService => ({
  async listEvents(input) {
    return (
      await repository.list({
        ...input,
        schemaVersion: productEventSchemaVersion,
      })
    ).map(toProductEvent);
  },
  async listSeedSnapshots() {
    return (await repository.listSeedSnapshots()).map((seed) => ({
      createdAt: seed.createdAt.toISOString(),
      id: seed.id,
      stage: seed.stage,
      userId: seed.userId,
    }));
  },
  async record(input) {
    await repository.insert(toPersistedProductEvent(input));
  },
});

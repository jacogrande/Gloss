import {
  listSeedsDataSchema,
  productEventSchemaVersion,
} from "@gloss/shared/contracts";
import { notFoundError } from "@gloss/shared/errors";
import type {
  CreateSeedInput,
  ListSeedsQuery,
  SeedDetail,
  UpdateSeedInput,
} from "@gloss/shared/types";

import type { GlossDatabase } from "../lib/db";
import type { Logger } from "../lib/logger";
import {
  normalizeCaptureInput,
  normalizeSeedUpdateInput,
  toSeedDetail,
  toSeedSummary,
} from "../lib/seed-contracts";
import {
  createSeedRepository,
  type SeedRepository,
} from "../repositories/seed-repository";
import {
  createSeedEnrichmentRepository,
  type SeedEnrichmentRepository,
} from "../repositories/seed-enrichment-repository";
import type { ProductEventService } from "./product-event-service";

export type SeedService = {
  createSeed: (input: { capture: CreateSeedInput; userId: string }) => Promise<SeedDetail>;
  getSeedDetail: (input: { requestId?: string; seedId: string; userId: string }) => Promise<SeedDetail>;
  listSeeds: (input: { query: ListSeedsQuery; userId: string }) => Promise<ReturnType<typeof listSeedsDataSchema.parse>>;
  updateSeed: (input: { patch: UpdateSeedInput; requestId?: string; seedId: string; userId: string }) => Promise<SeedDetail>;
};

export const createSeedService = (
  db: GlossDatabase,
  repository: SeedRepository = createSeedRepository(db),
  enrichmentRepository: SeedEnrichmentRepository = createSeedEnrichmentRepository(
    db,
  ),
  sideEffects?: {
    logger: Logger;
    productEventService: ProductEventService;
  },
): SeedService => ({
  async createSeed(input) {
    const normalizedCapture = normalizeCaptureInput(input.capture);
    const createdRecord = await repository.createSeed({
      capture: normalizedCapture,
      userId: input.userId,
    });
    const enrichment = await enrichmentRepository.getCurrentForSeed({
      seedId: createdRecord.seed.id,
      userId: input.userId,
    });

    if (sideEffects) {
      try {
        await sideEffects.productEventService.record({
          actorTag: input.userId,
          occurredAt: createdRecord.seed.createdAt.toISOString(),
          payload: {
            hasSentence: Boolean(normalizedCapture.sentence),
            sourceKind: normalizedCapture.source?.kind ?? null,
            stage: createdRecord.seed.stage,
          },
          schemaVersion: productEventSchemaVersion,
          seedId: createdRecord.seed.id,
          type: "seed.capture",
          userId: input.userId,
        });
      } catch (error) {
        sideEffects.logger.warn("product_event.record_failed", {
          eventType: "seed.capture",
          seedId: createdRecord.seed.id,
          userId: input.userId,
          error:
            error instanceof Error
              ? error.message
              : "Unexpected non-error while recording product event.",
        });
      }
    }

    return toSeedDetail({
      ...createdRecord,
      enrichment,
    });
  },
  async getSeedDetail(input) {
    const detailRecord = await repository.getSeedDetail({
      seedId: input.seedId,
      userId: input.userId,
    });

    if (!detailRecord) {
      throw notFoundError("Seed not found.", input.requestId);
    }

    return toSeedDetail({
      ...detailRecord,
      enrichment: await enrichmentRepository.getCurrentForSeed({
        seedId: input.seedId,
        userId: input.userId,
      }),
    });
  },
  async listSeeds(input) {
    const listed = await repository.listSeeds(input);

    return listSeedsDataSchema.parse({
      items: listed.items.map(toSeedSummary),
      total: listed.total,
    });
  },
  async updateSeed(input) {
    const normalizedPatch = normalizeSeedUpdateInput(input.patch);
    const updatedRecord = await repository.updateSeed({
      patch: normalizedPatch,
      seedId: input.seedId,
      userId: input.userId,
    });

    if (!updatedRecord) {
      throw notFoundError("Seed not found.", input.requestId);
    }

    return toSeedDetail({
      ...updatedRecord,
      enrichment: await enrichmentRepository.getCurrentForSeed({
        seedId: input.seedId,
        userId: input.userId,
      }),
    });
  },
});

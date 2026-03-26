import {
  listSeedsDataSchema,
} from "@gloss/shared/contracts";
import { notFoundError } from "@gloss/shared/errors";
import type {
  CreateSeedInput,
  ListSeedsQuery,
  SeedDetail,
} from "@gloss/shared/types";

import type { GlossDatabase } from "../lib/db";
import {
  normalizeCaptureInput,
  toSeedDetail,
  toSeedSummary,
} from "../lib/seed-contracts";
import {
  createSeedRepository,
  type SeedRepository,
} from "../repositories/seed-repository";

export type SeedService = {
  createSeed: (input: { capture: CreateSeedInput; userId: string }) => Promise<SeedDetail>;
  getSeedDetail: (input: { requestId?: string; seedId: string; userId: string }) => Promise<SeedDetail>;
  listSeeds: (input: { query: ListSeedsQuery; userId: string }) => Promise<ReturnType<typeof listSeedsDataSchema.parse>>;
};

export const createSeedService = (
  db: GlossDatabase,
  repository: SeedRepository = createSeedRepository(db),
): SeedService => ({
  async createSeed(input) {
    const normalizedCapture = normalizeCaptureInput(input.capture);
    const createdRecord = await repository.createSeed({
      capture: normalizedCapture,
      userId: input.userId,
    });

    return toSeedDetail(createdRecord);
  },
  async getSeedDetail(input) {
    const detailRecord = await repository.getSeedDetail({
      seedId: input.seedId,
      userId: input.userId,
    });

    if (!detailRecord) {
      throw notFoundError("Seed not found.", input.requestId);
    }

    return toSeedDetail(detailRecord);
  },
  async listSeeds(input) {
    const listed = await repository.listSeeds(input);

    return listSeedsDataSchema.parse({
      items: listed.items.map(toSeedSummary),
      total: listed.total,
    });
  },
});

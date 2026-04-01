import {
  and,
  asc,
  count,
  desc,
  eq,
} from "drizzle-orm";

import type {
  CreateSeedInput,
  ListSeedsQuery,
  SourceKind,
  UpdateSeedInput,
} from "@gloss/shared/types";

import {
  seedContextsTable,
  seedsTable,
  sourcesTable,
  type SeedContextRow,
  type SeedRow,
  type SourceRow,
} from "../db/schema";
import type { GlossDatabase } from "../lib/db";
import {
  type SourceSummaryRecord,
  normalizeWord,
} from "../lib/seed-contracts";

type CreateSeedRecordInput = {
  capture: CreateSeedInput;
  userId: string;
};

type UpdateSeedRecordInput = {
  patch: UpdateSeedInput;
  seedId: string;
  userId: string;
};

export type CreatedSeedRecord = {
  contexts: SeedContextRow[];
  seed: SeedRow;
  source: SourceSummaryRecord | null;
};

export type ListedSeedRecord = {
  primaryContext: SeedContextRow | null;
  seed: SeedRow;
  source: SourceSummaryRecord | null;
};

export type ListedSeedsResult = {
  items: ListedSeedRecord[];
  total: number;
};

export type SeedRepository = {
  createSeed: (input: CreateSeedRecordInput) => Promise<CreatedSeedRecord>;
  getSeedDetail: (input: { seedId: string; userId: string }) => Promise<CreatedSeedRecord | null>;
  listSeeds: (input: { query: ListSeedsQuery; userId: string }) => Promise<ListedSeedsResult>;
  updateSeed: (input: UpdateSeedRecordInput) => Promise<CreatedSeedRecord | null>;
};

const buildSeedListWhere = (input: {
  query: ListSeedsQuery;
  userId: string;
}): ReturnType<typeof and> =>
  and(
    eq(seedsTable.userId, input.userId),
    input.query.stage ? eq(seedsTable.stage, input.query.stage) : undefined,
  );

type SourceProjection = {
  sourceAuthor: string | null;
  sourceId: string | null;
  sourceKind: SourceKind | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
};

const toSourceSummaryRecord = (
  source: SourceProjection,
): SourceSummaryRecord | null =>
  source.sourceId && source.sourceKind
    ? {
        author: source.sourceAuthor,
        id: source.sourceId,
        kind: source.sourceKind,
        title: source.sourceTitle,
        url: source.sourceUrl,
      }
    : null;

const toSourceSummaryRecordFromRow = (
  source: SourceRow | null,
): SourceSummaryRecord | null =>
  source
    ? {
        author: source.author,
        id: source.id,
        kind: source.kind,
        title: source.title,
        url: source.url,
      }
    : null;

export const createSeedRepository = (
  db: GlossDatabase,
): SeedRepository => ({
  async createSeed(input) {
    return db.transaction(async (transaction) => {
      const normalizedWord = normalizeWord(input.capture.word);
      const createdSource = input.capture.source
        ? (
            await transaction
              .insert(sourcesTable)
              .values({
                author: input.capture.source.author ?? null,
                id: crypto.randomUUID(),
                kind: input.capture.source.kind,
                title: input.capture.source.title ?? null,
                url: input.capture.source.url ?? null,
                userId: input.userId,
              })
              .returning()
          )[0] ?? null
        : null;
      const createdSeed = (
        await transaction
          .insert(seedsTable)
          .values({
            id: crypto.randomUUID(),
            normalizedWord,
            sourceId: createdSource?.id ?? null,
            stage: "new",
            userId: input.userId,
            word: input.capture.word,
          })
          .returning()
      )[0];

      if (!createdSeed) {
        throw new Error("Seed creation did not return a row.");
      }

      const createdContexts =
        input.capture.sentence === undefined
          ? []
          : await transaction
              .insert(seedContextsTable)
              .values({
                id: crypto.randomUUID(),
                isPrimary: true,
                kind: "sentence",
                seedId: createdSeed.id,
                text: input.capture.sentence,
              })
              .returning();

      return {
        contexts: createdContexts,
        seed: createdSeed,
        source: createdSource,
      };
    });
  },
  async getSeedDetail(input) {
    const rows = await db
      .select({
        context: seedContextsTable,
        seed: seedsTable,
        sourceAuthor: sourcesTable.author,
        sourceId: sourcesTable.id,
        sourceKind: sourcesTable.kind,
        sourceTitle: sourcesTable.title,
        sourceUrl: sourcesTable.url,
      })
      .from(seedsTable)
      .leftJoin(sourcesTable, eq(seedsTable.sourceId, sourcesTable.id))
      .leftJoin(seedContextsTable, eq(seedContextsTable.seedId, seedsTable.id))
      .where(
        and(eq(seedsTable.id, input.seedId), eq(seedsTable.userId, input.userId)),
      )
      .orderBy(desc(seedContextsTable.isPrimary), asc(seedContextsTable.createdAt));

    const firstRow = rows[0];

    if (!firstRow) {
      return null;
    }

    return {
      contexts: rows
        .map((row) => row.context)
        .filter((context): context is SeedContextRow => context !== null),
      seed: firstRow.seed,
      source: toSourceSummaryRecord(firstRow),
    };
  },
  async listSeeds(input) {
    const whereClause = buildSeedListWhere(input);
    const [totalRow] = await db
      .select({ value: count() })
      .from(seedsTable)
      .where(whereClause);
    const rows = await db
      .select({
        primaryContext: seedContextsTable,
        seed: seedsTable,
        sourceAuthor: sourcesTable.author,
        sourceId: sourcesTable.id,
        sourceKind: sourcesTable.kind,
        sourceTitle: sourcesTable.title,
        sourceUrl: sourcesTable.url,
      })
      .from(seedsTable)
      .leftJoin(sourcesTable, eq(seedsTable.sourceId, sourcesTable.id))
      .leftJoin(
        seedContextsTable,
        and(
          eq(seedContextsTable.seedId, seedsTable.id),
          eq(seedContextsTable.isPrimary, true),
        ),
      )
      .where(whereClause)
      .orderBy(desc(seedsTable.createdAt));

    return {
      items: rows.map((row) => ({
        primaryContext: row.primaryContext,
        seed: row.seed,
        source: toSourceSummaryRecord(row),
      })),
      total: totalRow?.value ?? 0,
    };
  },
  async updateSeed(input) {
    return db.transaction(async (transaction) => {
      const seed = (
        await transaction
          .select()
          .from(seedsTable)
          .where(
            and(eq(seedsTable.id, input.seedId), eq(seedsTable.userId, input.userId)),
          )
          .limit(1)
      )[0];

      if (!seed) {
        return null;
      }

      const now = new Date();
      const existingSource = seed.sourceId
        ? (
            await transaction
              .select()
              .from(sourcesTable)
              .where(
                and(
                  eq(sourcesTable.id, seed.sourceId),
                  eq(sourcesTable.userId, input.userId),
                ),
              )
              .limit(1)
          )[0] ?? null
        : null;
      let nextSource = existingSource;
      let nextSourceId = existingSource?.id ?? null;

      if ("source" in input.patch) {
        if (input.patch.source === null) {
          if (existingSource) {
            await transaction
              .delete(sourcesTable)
              .where(
                and(
                  eq(sourcesTable.id, existingSource.id),
                  eq(sourcesTable.userId, input.userId),
                ),
              );
          }

          nextSource = null;
          nextSourceId = null;
        } else if (input.patch.source) {
          nextSource = existingSource
            ? (
                await transaction
                  .update(sourcesTable)
                  .set({
                    author: input.patch.source.author ?? null,
                    kind: input.patch.source.kind,
                    title: input.patch.source.title ?? null,
                    updatedAt: now,
                    url: input.patch.source.url ?? null,
                  })
                  .where(
                    and(
                      eq(sourcesTable.id, existingSource.id),
                      eq(sourcesTable.userId, input.userId),
                    ),
                  )
                  .returning()
              )[0] ?? existingSource
            : (
                await transaction
                  .insert(sourcesTable)
                  .values({
                    author: input.patch.source.author ?? null,
                    id: crypto.randomUUID(),
                    kind: input.patch.source.kind,
                    title: input.patch.source.title ?? null,
                    url: input.patch.source.url ?? null,
                    userId: input.userId,
                  })
                  .returning()
              )[0] ?? null;

          nextSourceId = nextSource?.id ?? null;
        }
      }

      const existingPrimaryContext = (
        await transaction
          .select()
          .from(seedContextsTable)
          .where(
            and(
              eq(seedContextsTable.seedId, input.seedId),
              eq(seedContextsTable.isPrimary, true),
            ),
          )
          .orderBy(desc(seedContextsTable.createdAt))
          .limit(1)
      )[0] ?? null;

      if ("sentence" in input.patch) {
        if (input.patch.sentence === null) {
          if (existingPrimaryContext) {
            await transaction
              .delete(seedContextsTable)
              .where(eq(seedContextsTable.id, existingPrimaryContext.id));
          }
        } else if (input.patch.sentence) {
          if (existingPrimaryContext) {
            await transaction
              .update(seedContextsTable)
              .set({
                text: input.patch.sentence,
              })
              .where(eq(seedContextsTable.id, existingPrimaryContext.id));
          } else {
            await transaction.insert(seedContextsTable).values({
              id: crypto.randomUUID(),
              isPrimary: true,
              kind: "sentence",
              seedId: input.seedId,
              text: input.patch.sentence,
            });
          }
        }
      }

      const updatedSeed = (
        await transaction
          .update(seedsTable)
          .set({
            sourceId: nextSourceId,
            updatedAt: now,
          })
          .where(
            and(eq(seedsTable.id, input.seedId), eq(seedsTable.userId, input.userId)),
          )
          .returning()
      )[0];

      if (!updatedSeed) {
        throw new Error("Seed update did not return a row.");
      }

      const contexts = await transaction
        .select()
        .from(seedContextsTable)
        .where(eq(seedContextsTable.seedId, input.seedId))
        .orderBy(desc(seedContextsTable.isPrimary), asc(seedContextsTable.createdAt));

      return {
        contexts,
        seed: updatedSeed,
        source: toSourceSummaryRecordFromRow(nextSource),
      };
    });
  },
});

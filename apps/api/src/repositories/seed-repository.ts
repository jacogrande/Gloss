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
} from "@gloss/shared/types";

import {
  seedContextsTable,
  seedsTable,
  sourcesTable,
  type SeedContextRow,
  type SeedRow,
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
});

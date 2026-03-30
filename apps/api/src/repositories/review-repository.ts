import {
  and,
  desc,
  eq,
} from "drizzle-orm";

import type {
  ReviewAnswerKey,
  ReviewCardPromptPayload,
  ReviewDimension,
  ReviewExerciseType,
  ReviewGenerationSource,
  ReviewOutcome,
  SeedStage,
} from "@gloss/shared/types";

import {
  reviewCardsTable,
  reviewCardTracesTable,
  reviewEventsTable,
  reviewSessionsTable,
  reviewStatesTable,
  seedContextsTable,
  seedEnrichmentsTable,
  seedsTable,
  sourcesTable,
  type ReviewCardRow,
  type ReviewSessionRow,
  type ReviewStateRow,
  type SeedContextRow,
  type SeedEnrichmentRow,
  type SeedRow,
} from "../db/schema";
import type { GlossDatabase } from "../lib/db";
import type { ReviewCardTraceDraft } from "../lib/review-contracts";
import type { SourceSummaryRecord } from "../lib/seed-contracts";

type ReviewStateUpsert = {
  distinctionDueAt: Date;
  distinctionScore: number;
  id: string;
  lastReviewedAt: Date;
  lastSessionId: string;
  recognitionDueAt: Date;
  recognitionScore: number;
  schedulerVersion: string;
  seedId: string;
  usageDueAt: Date;
  usageScore: number;
};

type ReviewCandidateRecord = {
  enrichment: SeedEnrichmentRow;
  primaryContext: SeedContextRow | null;
  reviewState: ReviewStateRow | null;
  seed: SeedRow;
  source: SourceSummaryRecord | null;
};

type PersistedSessionRecord = {
  cards: ReviewCardRow[];
  session: ReviewSessionRow;
};

type CreateReviewCardRecordInput = {
  answerKey: ReviewAnswerKey;
  dimension: ReviewDimension;
  exerciseType: ReviewExerciseType;
  generationSource: ReviewGenerationSource;
  model: string | null;
  promptPayload: ReviewCardPromptPayload;
  promptTemplateVersion: string;
  provider: string | null;
  schemaVersion: string;
  seedId: string;
  trace: ReviewCardTraceDraft;
};

export type ReviewRepository = {
  createSessionWithCards: (input: {
    cards: CreateReviewCardRecordInput[];
    userId: string;
  }) => Promise<PersistedSessionRecord>;
  getActiveSession: (input: { userId: string }) => Promise<PersistedSessionRecord | null>;
  getSessionById: (input: {
    sessionId: string;
    userId: string;
  }) => Promise<PersistedSessionRecord | null>;
  getReviewStateForSeed: (input: {
    seedId: string;
    userId: string;
  }) => Promise<ReviewStateRow | null>;
  listReviewCandidates: (input: { userId: string }) => Promise<ReviewCandidateRecord[]>;
  persistCardSubmission: (input: {
    cardId: string;
    dimension: ReviewDimension;
    exerciseType: ReviewExerciseType;
    responseLatencyMs: number | null;
    responsePayload: Record<string, unknown>;
    result: {
      outcome: ReviewOutcome;
      stateDelta: {
        nextDueAt: string;
        nextScore: number;
        previousDueAt: string;
        previousScore: number;
      };
    };
    seedId: string;
    nextSeedStage: SeedStage;
    nextState: ReviewStateUpsert;
    sessionId: string;
    userId: string;
  }) => Promise<PersistedSessionRecord>;
};

type SourceProjection = {
  sourceAuthor: string | null;
  sourceId: string | null;
  sourceKind: SourceSummaryRecord["kind"] | null;
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

const requireRow = <TRow>(row: TRow | undefined, message: string): TRow => {
  if (!row) {
    throw new Error(message);
  }

  return row;
};

const loadCardsForSession = async (
  db: GlossDatabase,
  input: {
    sessionId: string;
    userId: string;
  },
): Promise<ReviewCardRow[]> =>
  db
    .select()
    .from(reviewCardsTable)
    .where(
      and(
        eq(reviewCardsTable.reviewSessionId, input.sessionId),
        eq(reviewCardsTable.userId, input.userId),
      ),
    )
    .orderBy(reviewCardsTable.position);

export const createReviewRepository = (
  db: GlossDatabase,
): ReviewRepository => ({
  async createSessionWithCards(input) {
    return db.transaction(async (transaction) => {
      const createdSession = requireRow(
        (
          await transaction
            .insert(reviewSessionsTable)
            .values({
              cardCount: input.cards.length,
              id: crypto.randomUUID(),
              status: "active",
              userId: input.userId,
            })
            .returning()
        )[0],
        "Review session creation did not return a row.",
      );
      const createdCards = await transaction
        .insert(reviewCardsTable)
        .values(
          input.cards.map((card, index) => ({
            answerKey: card.answerKey,
            dimension: card.dimension,
            exerciseType: card.exerciseType,
            generationSource: card.generationSource,
            id: crypto.randomUUID(),
            model: card.model,
            position: index,
            promptPayload: card.promptPayload,
            promptTemplateVersion: card.promptTemplateVersion,
            provider: card.provider,
            reviewSessionId: createdSession.id,
            schemaVersion: card.schemaVersion,
            seedId: card.seedId,
            status: "pending" as const,
            userId: input.userId,
          })),
        )
        .returning();
      const sortedCards = createdCards
        .slice()
        .sort((left, right) => left.position - right.position);

      await transaction.insert(reviewCardTracesTable).values(
        sortedCards.map((card) => {
          const draft = input.cards[card.position];

          if (!draft) {
            throw new Error(
              `Missing review trace input for card position ${card.position}.`,
            );
          }

          return {
            generationSource: card.generationSource,
            id: crypto.randomUUID(),
            inputRedacted: draft.trace.inputRedacted,
            model: card.model,
            outputRedacted: draft.trace.outputRedacted,
            promptTemplateVersion: card.promptTemplateVersion,
            provider: card.provider,
            reviewCardId: card.id,
            reviewSessionId: createdSession.id,
            schemaVersion: card.schemaVersion,
            seedId: card.seedId,
            userId: input.userId,
            validationResult: draft.trace.validationResult,
          };
        }),
      );

      return {
        cards: sortedCards,
        session: createdSession,
      };
    });
  },
  async getActiveSession(input) {
    const session = (
      await db
        .select()
        .from(reviewSessionsTable)
        .where(
          and(
            eq(reviewSessionsTable.userId, input.userId),
            eq(reviewSessionsTable.status, "active"),
          ),
        )
        .orderBy(desc(reviewSessionsTable.startedAt))
        .limit(1)
    )[0];

    if (!session) {
      return null;
    }

    return {
      cards: await loadCardsForSession(db, {
        sessionId: session.id,
        userId: input.userId,
      }),
      session,
    };
  },
  async getSessionById(input) {
    const session = (
      await db
        .select()
        .from(reviewSessionsTable)
        .where(
          and(
            eq(reviewSessionsTable.id, input.sessionId),
            eq(reviewSessionsTable.userId, input.userId),
          ),
        )
        .limit(1)
    )[0];

    if (!session) {
      return null;
    }

    return {
      cards: await loadCardsForSession(db, input),
      session,
    };
  },
  async getReviewStateForSeed(input) {
    const row = (
      await db
        .select()
        .from(reviewStatesTable)
        .where(
          and(
            eq(reviewStatesTable.seedId, input.seedId),
            eq(reviewStatesTable.userId, input.userId),
          ),
        )
        .limit(1)
    )[0];

    return row ?? null;
  },
  async listReviewCandidates(input) {
    const rows = await db
      .select({
        enrichment: seedEnrichmentsTable,
        primaryContext: seedContextsTable,
        reviewState: reviewStatesTable,
        seed: seedsTable,
        sourceAuthor: sourcesTable.author,
        sourceId: sourcesTable.id,
        sourceKind: sourcesTable.kind,
        sourceTitle: sourcesTable.title,
        sourceUrl: sourcesTable.url,
      })
      .from(seedsTable)
      .innerJoin(
        seedEnrichmentsTable,
        and(
          eq(seedEnrichmentsTable.seedId, seedsTable.id),
          eq(seedEnrichmentsTable.userId, input.userId),
          eq(seedEnrichmentsTable.status, "ready"),
        ),
      )
      .leftJoin(sourcesTable, eq(seedsTable.sourceId, sourcesTable.id))
      .leftJoin(
        seedContextsTable,
        and(
          eq(seedContextsTable.seedId, seedsTable.id),
          eq(seedContextsTable.isPrimary, true),
        ),
      )
      .leftJoin(
        reviewStatesTable,
        and(
          eq(reviewStatesTable.seedId, seedsTable.id),
          eq(reviewStatesTable.userId, input.userId),
        ),
      )
      .where(eq(seedsTable.userId, input.userId))
      .orderBy(desc(seedsTable.updatedAt));

    return rows.map((row) => ({
      enrichment: row.enrichment,
      primaryContext: row.primaryContext,
      reviewState: row.reviewState,
      seed: row.seed,
      source: toSourceSummaryRecord(row),
    }));
  },
  async persistCardSubmission(input) {
    return db.transaction(async (transaction) => {
      const answeredAt = new Date();
      const nextCardStatus =
        input.result.outcome === "skipped" ? "skipped" : "answered";
      const answeredCard = (
        await transaction
        .update(reviewCardsTable)
        .set({
          status: nextCardStatus,
          updatedAt: answeredAt,
        })
        .where(
          and(
            eq(reviewCardsTable.id, input.cardId),
            eq(reviewCardsTable.reviewSessionId, input.sessionId),
            eq(reviewCardsTable.status, "pending"),
            eq(reviewCardsTable.userId, input.userId),
          ),
        )
        .returning()
      )[0];

      if (!answeredCard) {
        throw new Error("Review card is not pending.");
      }

      await transaction
        .insert(reviewStatesTable)
        .values({
          createdAt: answeredAt,
          distinctionDueAt: input.nextState.distinctionDueAt,
          distinctionScore: input.nextState.distinctionScore,
          id: input.nextState.id,
          lastReviewedAt: input.nextState.lastReviewedAt,
          lastSessionId: input.nextState.lastSessionId,
          recognitionDueAt: input.nextState.recognitionDueAt,
          recognitionScore: input.nextState.recognitionScore,
          schedulerVersion: input.nextState.schedulerVersion,
          seedId: input.nextState.seedId,
          updatedAt: answeredAt,
          usageDueAt: input.nextState.usageDueAt,
          usageScore: input.nextState.usageScore,
          userId: input.userId,
        })
        .onConflictDoUpdate({
          set: {
            distinctionDueAt: input.nextState.distinctionDueAt,
            distinctionScore: input.nextState.distinctionScore,
            lastReviewedAt: input.nextState.lastReviewedAt,
            lastSessionId: input.nextState.lastSessionId,
            recognitionDueAt: input.nextState.recognitionDueAt,
            recognitionScore: input.nextState.recognitionScore,
            schedulerVersion: input.nextState.schedulerVersion,
            updatedAt: answeredAt,
            usageDueAt: input.nextState.usageDueAt,
            usageScore: input.nextState.usageScore,
          },
          target: [reviewStatesTable.seedId, reviewStatesTable.userId],
        });

      await transaction
        .update(seedsTable)
        .set({
          stage: input.nextSeedStage,
          updatedAt: answeredAt,
        })
        .where(
          and(
            eq(seedsTable.id, input.seedId),
            eq(seedsTable.userId, input.userId),
          ),
        );

      await transaction.insert(reviewEventsTable).values({
        dimension: input.dimension,
        exerciseType: input.exerciseType,
        id: crypto.randomUUID(),
        outcome: input.result.outcome,
        responseLatencyMs: input.responseLatencyMs,
        responsePayload: input.responsePayload,
        reviewCardId: input.cardId,
        reviewSessionId: input.sessionId,
        seedId: input.seedId,
        stateDelta: input.result.stateDelta,
        userId: input.userId,
      });
      const remainingPendingCards = await transaction
        .select({
          id: reviewCardsTable.id,
        })
        .from(reviewCardsTable)
        .where(
          and(
            eq(reviewCardsTable.reviewSessionId, input.sessionId),
            eq(reviewCardsTable.status, "pending"),
            eq(reviewCardsTable.userId, input.userId),
          ),
        );
      const completeSession = remainingPendingCards.length === 0;

      await transaction
        .update(reviewSessionsTable)
        .set({
          completedAt: completeSession ? answeredAt : null,
          status: completeSession ? "completed" : "active",
          updatedAt: answeredAt,
        })
        .where(
          and(
            eq(reviewSessionsTable.id, input.sessionId),
            eq(reviewSessionsTable.userId, input.userId),
          ),
        );

      const session = requireRow(
        (
          await transaction
            .select()
            .from(reviewSessionsTable)
            .where(
              and(
                eq(reviewSessionsTable.id, input.sessionId),
                eq(reviewSessionsTable.userId, input.userId),
              ),
            )
            .limit(1)
        )[0],
        "Expected review session to exist after submission.",
      );
      const cards = await transaction
        .select()
        .from(reviewCardsTable)
        .where(
          and(
            eq(reviewCardsTable.reviewSessionId, input.sessionId),
            eq(reviewCardsTable.userId, input.userId),
          ),
        )
        .orderBy(reviewCardsTable.position);

      return {
        cards,
        session,
      };
    });
  },
});

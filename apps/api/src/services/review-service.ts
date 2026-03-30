import type { ServerEnv } from "@gloss/shared/env";
import { productEventSchemaVersion } from "@gloss/shared/contracts";
import {
  notFoundError,
  reviewConflictError,
} from "@gloss/shared/errors";
import type {
  ReviewQueueSummary,
  ReviewSessionDetail,
  ReviewSubmissionInput,
  ReviewSubmissionResult,
  SeedDetail,
} from "@gloss/shared/types";
import type { Pool } from "pg";

import type { DatabaseClient, GlossDatabase } from "../lib/db";
import type { Logger } from "../lib/logger";
import { withPostgresAdvisoryLock } from "../lib/postgres-lock";
import type {
  SeedContextRow,
  SeedEnrichmentRow,
  SeedRow,
} from "../db/schema";
import {
  applyReviewOutcomeToState,
  buildContrastiveChoiceCardDraft,
  buildDeterministicRecognitionCardDraft,
  buildMeaningInContextCardDraft,
  buildRegisterJudgmentCardDraft,
  deriveSeedStageFromReviewState,
  reviewCardPromptTemplateVersion,
  type ReviewCardDraft,
  selectDueReviewTargets,
  toReviewQueueSummary,
  toReviewSessionDetail,
} from "../lib/review-contracts";
import {
  createReviewModelProvider,
  type ReviewModelProvider,
} from "../lib/review-providers";
import { toSeedDetail } from "../lib/seed-contracts";
import {
  createReviewRepository,
  type ReviewRepository,
} from "../repositories/review-repository";
import type { RequestRateLimitService } from "./request-rate-limit-service";
import type { ProductEventService } from "./product-event-service";
import type { SourceSummaryRecord } from "../lib/seed-contracts";

export type ReviewService = {
  getQueueSummary: (input: { userId: string }) => Promise<ReviewQueueSummary>;
  getSession: (input: {
    requestId?: string;
    sessionId: string;
    userId: string;
  }) => Promise<ReviewSessionDetail>;
  startOrResumeSession: (input: {
    limit?: number;
    requestId?: string;
    userId: string;
  }) => Promise<ReviewSessionDetail>;
  submitCardAnswer: (input: {
    cardId: string;
    requestId?: string;
    sessionId: string;
    submission: ReviewSubmissionInput;
    userId: string;
  }) => Promise<{
    result: ReviewSubmissionResult;
    session: ReviewSessionDetail;
  }>;
};

const defaultSessionLimit = 4;

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof (error as { code?: unknown }).code === "string" &&
  (error as { code: string }).code === "23505";

const toReviewSeedDetail = (input: {
  contexts: SeedContextRow[];
  enrichment: SeedEnrichmentRow | null;
  seed: SeedRow;
  source: SourceSummaryRecord | null;
}): SeedDetail =>
  toSeedDetail({
    contexts: input.contexts,
    enrichment: input.enrichment,
    seed: input.seed,
    source: input.source,
  });

const buildQueueSummary = async (input: {
  repository: ReviewRepository;
  userId: string;
}): Promise<ReviewQueueSummary> => {
  const [activeSession, candidates] = await Promise.all([
    input.repository.getActiveSession({ userId: input.userId }),
    input.repository.listReviewCandidates({ userId: input.userId }),
  ]);
  const now = new Date();
  const dueByDimension = {
    distinction: 0,
    recognition: 0,
    usage: 0,
  };
  let dueCount = 0;

  for (const candidate of candidates) {
    const targets = selectDueReviewTargets({
      candidates: [
        {
          reviewState: candidate.reviewState,
          seed: toReviewSeedDetail({
            contexts: candidate.primaryContext ? [candidate.primaryContext] : [],
            enrichment: candidate.enrichment,
            seed: candidate.seed,
            source: candidate.source,
          }),
        },
      ],
      limit: 3,
      now,
    });

    if (targets.length > 0) {
      dueCount += 1;
    }

    for (const target of targets) {
      dueByDimension[target.dimension] += 1;
    }
  }

  return toReviewQueueSummary({
    activeSessionId: activeSession?.session.id ?? null,
    availableCount: candidates.length,
    dueByDimension,
    dueCount,
  });
};

const buildCardDraft = async (input: {
  logger: Logger;
  modelProvider: ReviewModelProvider;
  seed: SeedDetail;
  exerciseType: "contrastive_choice" | "meaning_in_context" | "recognition_in_fresh_sentence" | "register_judgment";
}): Promise<ReviewCardDraft> => {
  switch (input.exerciseType) {
    case "contrastive_choice":
      return buildContrastiveChoiceCardDraft(input.seed);
    case "register_judgment":
      return buildRegisterJudgmentCardDraft(input.seed);
    case "recognition_in_fresh_sentence":
      try {
        const generated = await input.modelProvider.generateRecognitionFreshSentenceCard(
          input.seed,
        );

        return {
          answerKey: generated.answerKey,
          dimension: "recognition",
          exerciseType: "recognition_in_fresh_sentence",
          generationSource: "model",
          model: input.modelProvider.model,
          promptPayload: generated.promptPayload,
          promptTemplateVersion: reviewCardPromptTemplateVersion,
          provider: input.modelProvider.provider,
          schemaVersion: "review-card-prompt.v1",
          seedId: input.seed.id,
          trace: generated.trace,
        };
      } catch (error) {
        input.logger.warn("review.card_generation_fallback", {
          error:
            error instanceof Error
              ? error.message
              : "Unexpected non-error thrown while generating a recognition card.",
          exerciseType: input.exerciseType,
          seedId: input.seed.id,
        });

        return buildDeterministicRecognitionCardDraft(input.seed);
      }
    case "meaning_in_context":
    default:
      return buildMeaningInContextCardDraft(input.seed);
  }
};

const recordReviewProductEventSafely = async (input: {
  event:
    | {
        actorTag: string;
        occurredAt: string;
        payload: {
          cardCount: number;
          seedIds: string[];
        };
        reviewSessionId: string;
        schemaVersion: typeof productEventSchemaVersion;
        type: "review.session.started";
        userId: string;
      }
    | {
        actorTag: string;
        occurredAt: string;
        payload: {
          answeredCount: number;
          cardCount: number;
        };
        reviewSessionId: string;
        schemaVersion: typeof productEventSchemaVersion;
        type: "review.session.completed";
        userId: string;
      }
    | {
        actorTag: string;
        occurredAt: string;
        payload: {
          dimension: "distinction" | "recognition" | "usage";
          exerciseType:
            | "contrastive_choice"
            | "meaning_in_context"
            | "recognition_in_fresh_sentence"
            | "register_judgment";
          outcome: "correct" | "incorrect" | "partial" | "skipped";
          seedStage: "deepening" | "mature" | "new" | "stabilizing";
        };
        reviewSessionId: string;
        schemaVersion: typeof productEventSchemaVersion;
        seedId: string;
        type: "review.card.submitted";
        userId: string;
      };
  logger: Logger;
  productEventService: ProductEventService;
}): Promise<void> => {
  try {
    await input.productEventService.record(input.event);
  } catch (error) {
    input.logger.warn("product_event.record_failed", {
      eventType: input.event.type,
      reviewSessionId: input.event.reviewSessionId,
      seedId: "seedId" in input.event ? input.event.seedId : null,
      userId: input.event.userId,
      error:
        error instanceof Error
          ? error.message
          : "Unexpected non-error while recording product event.",
    });
  }
};

export const createReviewService = (input: {
  db: GlossDatabase;
  env: ServerEnv;
  logger: Logger;
  modelProvider?: ReviewModelProvider;
  pool: Pool;
  productEventService: ProductEventService;
  requestRateLimitService: RequestRateLimitService;
  repository?: ReviewRepository;
}): ReviewService => {
  const repository = input.repository ?? createReviewRepository(input.db);
  const modelProvider = input.modelProvider ?? createReviewModelProvider(input.env);

  return {
    async getQueueSummary({ userId }) {
      return buildQueueSummary({
        repository,
        userId,
      });
    },
    async getSession({ requestId, sessionId, userId }) {
      const persisted = await repository.getSessionById({
        sessionId,
        userId,
      });

      if (!persisted) {
        throw notFoundError("Review session not found.", requestId);
      }

      return toReviewSessionDetail(persisted);
    },
    async startOrResumeSession({ limit = defaultSessionLimit, requestId, userId }) {
      return withPostgresAdvisoryLock({
        key: userId,
        namespace: "review.session.start",
        pool: input.pool,
        run: async () => {
          const activeSession = await repository.getActiveSession({ userId });

          if (activeSession) {
            return toReviewSessionDetail(activeSession);
          }

          const candidates = await repository.listReviewCandidates({ userId });
          const reviewTargets = selectDueReviewTargets({
            candidates: candidates.map((candidate) => ({
              reviewState: candidate.reviewState,
              seed: toReviewSeedDetail({
                contexts: candidate.primaryContext ? [candidate.primaryContext] : [],
                enrichment: candidate.enrichment,
                seed: candidate.seed,
                source: candidate.source,
              }),
            })),
            limit,
            now: new Date(),
          });

          if (reviewTargets.length === 0) {
            throw reviewConflictError(
              "No reviewable seeds are ready yet.",
              requestId,
            );
          }

          await input.requestRateLimitService.enforce({
            actorKey: userId,
            policyKey: "review.session.start",
            ...(requestId
              ? {
                  requestId,
                }
              : {}),
          });

          const cards: ReviewCardDraft[] = [];

          for (const target of reviewTargets) {
            cards.push(
              await buildCardDraft({
                exerciseType: target.exerciseType,
                logger: input.logger,
                modelProvider,
                seed: target.seed,
              }),
            );
          }

          try {
            const persistedSession = await repository.createSessionWithCards({
              cards,
              userId,
            });

            await recordReviewProductEventSafely({
              event: {
                actorTag: userId,
                occurredAt: persistedSession.session.startedAt.toISOString(),
                payload: {
                  cardCount: persistedSession.session.cardCount,
                  seedIds: Array.from(
                    new Set(persistedSession.cards.map((card) => card.seedId)),
                  ),
                },
                reviewSessionId: persistedSession.session.id,
                schemaVersion: productEventSchemaVersion,
                type: "review.session.started",
                userId,
              },
              logger: input.logger,
              productEventService: input.productEventService,
            });

            return toReviewSessionDetail(persistedSession);
          } catch (error) {
            if (isUniqueViolation(error)) {
              const racedSession = await repository.getActiveSession({ userId });

              if (racedSession) {
                return toReviewSessionDetail(racedSession);
              }
            }

            throw error;
          }
        },
      });
    },
    async submitCardAnswer({ cardId, requestId, sessionId, submission, userId }) {
      const persistedSession = await repository.getSessionById({
        sessionId,
        userId,
      });

      if (!persistedSession) {
        throw notFoundError("Review session not found.", requestId);
      }

      if (persistedSession.session.status !== "active") {
        throw reviewConflictError(
          "Review session is not active.",
          requestId,
        );
      }

      const card = persistedSession.cards.find((value) => value.id === cardId);

      if (!card) {
        throw notFoundError("Review card not found.", requestId);
      }

      if (card.status !== "pending") {
        throw reviewConflictError(
          "Review card has already been answered.",
          requestId,
        );
      }

      const submissionResult = await withPostgresAdvisoryLock({
        key: card.seedId,
        namespace: "review.session.submit",
        pool: input.pool,
        run: async () => {
          const latestSession = await repository.getSessionById({
            sessionId,
            userId,
          });

          if (!latestSession) {
            throw notFoundError("Review session not found.", requestId);
          }

          if (latestSession.session.status !== "active") {
            throw reviewConflictError(
              "Review session is not active.",
              requestId,
            );
          }

          const latestCard = latestSession.cards.find((value) => value.id === cardId);

          if (!latestCard) {
            throw notFoundError("Review card not found.", requestId);
          }

          if (latestCard.status !== "pending") {
            throw reviewConflictError(
              "Review card has already been answered.",
              requestId,
            );
          }

          const currentState = await repository.getReviewStateForSeed({
            seedId: latestCard.seedId,
            userId,
          });
          const applied = applyReviewOutcomeToState({
            answerKey: latestCard.answerKey,
            currentState,
            dimension: latestCard.dimension,
            now: new Date(),
            seedId: latestCard.seedId,
            sessionId,
            stateId: currentState?.id ?? crypto.randomUUID(),
            submission,
          });
          const nextSeedStage = deriveSeedStageFromReviewState({
            distinctionScore: applied.nextState.distinctionScore,
            recognitionScore: applied.nextState.recognitionScore,
            usageScore: applied.nextState.usageScore,
          });

          let nextPersistedSession;

          try {
            nextPersistedSession = await repository.persistCardSubmission({
              cardId,
              dimension: latestCard.dimension,
              exerciseType: latestCard.exerciseType,
              nextSeedStage,
              nextState: applied.nextState,
              responseLatencyMs: submission.latencyMs ?? null,
              responsePayload: submission,
              result: {
                outcome: applied.outcome.outcome,
                stateDelta: applied.stateDelta,
              },
              seedId: latestCard.seedId,
              sessionId,
              userId,
            });
          } catch (error) {
            if (
              isUniqueViolation(error) ||
              (error instanceof Error &&
                error.message === "Review card is not pending.")
            ) {
              throw reviewConflictError(
                "Review card has already been answered.",
                requestId,
              );
            }

            throw error;
          }

          return {
            result: {
              cardId,
              correct: applied.outcome.correct,
              outcome: applied.outcome.outcome,
              seedStage: nextSeedStage,
            },
            session: nextPersistedSession,
          };
        },
      });

      await recordReviewProductEventSafely({
        event: {
          actorTag: userId,
          occurredAt: new Date().toISOString(),
          payload: {
            dimension: card.dimension,
            exerciseType: card.exerciseType,
            outcome: submissionResult.result.outcome,
            seedStage: submissionResult.result.seedStage,
          },
          reviewSessionId: sessionId,
          schemaVersion: productEventSchemaVersion,
          seedId: card.seedId,
          type: "review.card.submitted",
          userId,
        },
        logger: input.logger,
        productEventService: input.productEventService,
      });

      if (submissionResult.session.session.status === "completed") {
        const answeredCount = submissionResult.session.cards.filter(
          (value) => value.status !== "pending",
        ).length;

        await recordReviewProductEventSafely({
          event: {
            actorTag: userId,
            occurredAt:
              submissionResult.session.session.completedAt?.toISOString() ??
              new Date().toISOString(),
            payload: {
              answeredCount,
              cardCount: submissionResult.session.session.cardCount,
            },
            reviewSessionId: sessionId,
            schemaVersion: productEventSchemaVersion,
            type: "review.session.completed",
            userId,
          },
          logger: input.logger,
          productEventService: input.productEventService,
        });
      }

      return {
        result: submissionResult.result,
        session: toReviewSessionDetail(submissionResult.session),
      };
    },
  };
};

export const createDefaultReviewService = (input: {
  database: DatabaseClient;
  env: ServerEnv;
  logger: Logger;
  productEventService: ProductEventService;
  requestRateLimitService: RequestRateLimitService;
}): ReviewService =>
  createReviewService({
    db: input.database.db,
    env: input.env,
    logger: input.logger,
    pool: input.database.pool,
    productEventService: input.productEventService,
    requestRateLimitService: input.requestRateLimitService,
  });

import type { ServerEnv } from "@gloss/shared/env";
import { ZodError } from "zod";

import {
  enrichmentEvidenceUnavailableError,
  enrichmentProviderError,
  enrichmentSchemaInvalidError,
  isAppError,
  notFoundError,
} from "@gloss/shared/errors";
import type {
  LexicalEvidenceSnapshot,
  SeedDetail,
  SeedEnrichment,
} from "@gloss/shared/types";

import type { Logger } from "../lib/logger";
import type { GlossDatabase } from "../lib/db";
import { withPostgresAdvisoryLock } from "../lib/postgres-lock";
import {
  applyEnrichmentGuardrails,
  buildEnrichmentPrompts,
  buildLexicalEvidenceSnapshot,
  hasMinimumEvidenceForEnrichment,
  redactTraceOutput,
  seedEnrichmentPromptTemplateVersion,
  toSeedEnrichment,
} from "../lib/enrichment-contracts";
import {
  createEnrichmentProviders,
  type EnrichmentProviders,
} from "../lib/enrichment-providers";
import { normalizeWord, toSeedDetail } from "../lib/seed-contracts";
import {
  createSeedEnrichmentRepository,
  type SeedEnrichmentRepository,
} from "../repositories/seed-enrichment-repository";
import {
  createSeedRepository,
  type SeedRepository,
} from "../repositories/seed-repository";
import type { RequestRateLimitService } from "./request-rate-limit-service";
import type { Pool } from "pg";

export type EnrichmentService = {
  requestSeedEnrichment: (input: {
    requestId?: string;
    seedId: string;
    userId: string;
  }) => Promise<SeedEnrichment>;
};

const createEmptyDictionaryEvidence = (word: string): {
  exampleSentences: string[];
  glosses: string[];
  lemma: string;
  morphologyHints: string[];
  partOfSpeech: null;
  registerLabels: string[];
} => ({
  exampleSentences: [] as string[],
  glosses: [] as string[],
  lemma: normalizeWord(word),
  morphologyHints: [] as string[],
  partOfSpeech: null,
  registerLabels: [] as string[],
});

const toFailureError = (
  error: unknown,
  requestId?: string,
): ReturnType<typeof enrichmentProviderError> => {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof ZodError) {
    return enrichmentSchemaInvalidError(
      error.issues
        .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
        .join("; "),
      requestId,
    );
  }

  if (error instanceof Error) {
    return enrichmentProviderError(error.message, requestId);
  }

  return enrichmentProviderError(
    "An unexpected enrichment error occurred.",
    requestId,
  );
};

const seedEnrichmentSchemaVersion = "seed-enrichment-payload.v1" as const;
const activePendingLeaseMs = 120_000;

const isActivePendingEnrichment = (row: {
  status: string;
  updatedAt: Date;
}): boolean =>
  row.status === "pending" &&
  Date.now() - row.updatedAt.getTime() < activePendingLeaseMs;

const buildFallbackLexicalEvidence = (
  seed: Pick<SeedDetail, "primarySentence" | "source" | "word">,
): LexicalEvidenceSnapshot =>
  buildLexicalEvidenceSnapshot({
    dictionary: createEmptyDictionaryEvidence(seed.word),
    relations: {
      contrastCandidates: [],
      relatedCandidates: [],
    },
    seed,
  });

const logTracePersistenceFailure = (input: {
  error: unknown;
  logger: Logger;
  requestId: string | undefined;
  seedId: string;
  status: "failed" | "ready";
}): void => {
  input.logger.error("enrichment.trace_persist_failed", {
    error:
      input.error instanceof Error
        ? input.error.message
        : "Unexpected non-error thrown while persisting enrichment trace.",
    requestId: input.requestId,
    seedId: input.seedId,
    status: input.status,
  });
};

const measureAsync = async <TValue>(
  fn: () => Promise<TValue>,
): Promise<{
  latencyMs: number;
  value: TValue;
}> => {
  const startedAt = Date.now();
  const value = await fn();

  return {
    latencyMs: Date.now() - startedAt,
    value,
  };
};

export const createEnrichmentService = (input: {
  db: GlossDatabase;
  logger: Logger;
  pool: Pool;
  providers: EnrichmentProviders;
  requestRateLimitService: RequestRateLimitService;
  repository?: SeedRepository;
  seedEnrichmentRepository?: SeedEnrichmentRepository;
}): EnrichmentService => {
  const repository = input.repository ?? createSeedRepository(input.db);
  const seedEnrichmentRepository =
    input.seedEnrichmentRepository ?? createSeedEnrichmentRepository(input.db);

  const persistFailedEnrichment = async (inputValue: {
    enrichmentId: string;
    failure: ReturnType<typeof enrichmentProviderError>;
    lexicalEvidence: LexicalEvidenceSnapshot;
    requestId: string | undefined;
    seedId: string;
    userId: string;
  }): Promise<SeedEnrichment> => {
    const failedRow = await seedEnrichmentRepository.markFailed({
      enrichmentId: inputValue.enrichmentId,
      errorCode: inputValue.failure.code,
      guardrailFlags: [],
      model: input.providers.modelProvider.model,
      provider: input.providers.modelProvider.provider,
      seedId: inputValue.seedId,
      userId: inputValue.userId,
    });

    try {
      await seedEnrichmentRepository.createTrace({
        errorCode: inputValue.failure.code,
        guardrailFlags: [],
        lexicalEvidence: inputValue.lexicalEvidence,
        model: input.providers.modelProvider.model,
        outputRedacted: redactTraceOutput({
          errorCode: inputValue.failure.code,
        }),
        promptTemplateVersion: seedEnrichmentPromptTemplateVersion,
        provider: input.providers.modelProvider.provider,
        schemaVersion: failedRow.schemaVersion,
        seedEnrichmentId: failedRow.id,
        seedId: inputValue.seedId,
        status: failedRow.status,
        userId: inputValue.userId,
        validationResult: {
          accepted: false,
          issues: [inputValue.failure.message],
        },
      });
    } catch (traceError) {
      logTracePersistenceFailure({
        error: traceError,
        logger: input.logger,
        requestId: inputValue.requestId,
        seedId: inputValue.seedId,
        status: "failed",
      });
    }

    input.logger.error("enrichment.failed", {
      errorCode: inputValue.failure.code,
      failureMessage: inputValue.failure.message,
      model: input.providers.modelProvider.model,
      promptTemplateVersion: seedEnrichmentPromptTemplateVersion,
      provider: input.providers.modelProvider.provider,
      requestId: inputValue.requestId,
      schemaVersion: failedRow.schemaVersion,
      seedId: inputValue.seedId,
      status: failedRow.status,
      toolCalls:
        inputValue.failure.code === "ENRICHMENT_EVIDENCE_UNAVAILABLE" ? 2 : 3,
      userId: inputValue.userId,
      validationOutcome: "rejected",
    });

    return toSeedEnrichment(failedRow);
  };

  return {
    async requestSeedEnrichment({ requestId, seedId, userId }) {
      const startedAt = Date.now();
      const acquisition = await withPostgresAdvisoryLock({
        key: seedId,
        namespace: "seed.enrichment.request",
        pool: input.pool,
        run: async () => {
          const currentEnrichment =
            await seedEnrichmentRepository.getCurrentForSeed({ seedId, userId });

          if (currentEnrichment?.status === "ready") {
            return {
              enrichment: currentEnrichment,
              kind: "existing" as const,
            };
          }

          if (currentEnrichment && isActivePendingEnrichment(currentEnrichment)) {
            return {
              enrichment: currentEnrichment,
              kind: "existing" as const,
            };
          }

          const detailRecord = await repository.getSeedDetail({
            seedId,
            userId,
          });

          if (!detailRecord) {
            throw notFoundError("Seed not found.", requestId);
          }

          await input.requestRateLimitService.enforce({
            actorKey: userId,
            policyKey: "seeds.enrich",
            ...(requestId
              ? {
                  requestId,
                }
              : {}),
          });

          const pendingEnrichment = await seedEnrichmentRepository.acquirePending({
            model: input.providers.modelProvider.model,
            promptTemplateVersion: seedEnrichmentPromptTemplateVersion,
            provider: input.providers.modelProvider.provider,
            schemaVersion: seedEnrichmentSchemaVersion,
            seedId,
            staleBefore: new Date(Date.now() - activePendingLeaseMs),
            userId,
          });

          if (!pendingEnrichment) {
            const activeEnrichment =
              await seedEnrichmentRepository.getCurrentForSeed({ seedId, userId });

            if (activeEnrichment) {
              return {
                enrichment: activeEnrichment,
                kind: "existing" as const,
              };
            }

            throw enrichmentProviderError(
              "Unable to acquire enrichment work for this seed.",
              requestId,
            );
          }

          return {
            kind: "acquired" as const,
            pendingEnrichment,
            seedDetail: toSeedDetail({
              ...detailRecord,
              enrichment: currentEnrichment,
            }),
          };
        },
      });

      if (acquisition.kind === "existing") {
        return toSeedEnrichment(acquisition.enrichment);
      }

      const { pendingEnrichment, seedDetail } = acquisition;

      const logContext = {
        model: input.providers.modelProvider.model,
        promptTemplateVersion: seedEnrichmentPromptTemplateVersion,
        provider: input.providers.modelProvider.provider,
        requestId,
        schemaVersion: seedEnrichmentSchemaVersion,
        seedId,
        userId,
      };
      let lexicalEvidence = buildFallbackLexicalEvidence(seedDetail);

      input.logger.info("enrichment.started", logContext);

      try {
        const [relationCandidatesResult, dictionaryEntryResult] = await Promise.all([
          measureAsync(() =>
            input.providers.lexicalEvidenceProvider.getRelationCandidates(
              seedDetail.word,
            ),
          ),
          measureAsync(() =>
            input.providers.lexicalEvidenceProvider.getDictionaryEntry(seedDetail.word),
          ),
        ]);

        lexicalEvidence = buildLexicalEvidenceSnapshot({
          dictionary:
            dictionaryEntryResult.value ??
            createEmptyDictionaryEvidence(seedDetail.word),
          relations: relationCandidatesResult.value,
          seed: seedDetail,
        });

        input.logger.info("enrichment.evidence.loaded", {
          ...logContext,
          contrastCandidateCount: lexicalEvidence.contrastCandidates.length,
          dictionaryGlossCount: lexicalEvidence.dictionaryGlosses.length,
          dictionaryLatencyMs: dictionaryEntryResult.latencyMs,
          exampleSentenceCount: lexicalEvidence.exampleSentences.length,
          morphologyHintCount: lexicalEvidence.morphologyHints.length,
          registerLabelCount: lexicalEvidence.registerLabels.length,
          relationLatencyMs: relationCandidatesResult.latencyMs,
          relatedCandidateCount: lexicalEvidence.relatedCandidates.length,
        });

        if (!hasMinimumEvidenceForEnrichment(lexicalEvidence)) {
          const failure = enrichmentEvidenceUnavailableError(
            "Lexical evidence was too weak to generate a safe enrichment.",
            requestId,
          );

          return await persistFailedEnrichment({
            enrichmentId: pendingEnrichment.id,
            failure,
            lexicalEvidence,
            requestId,
            seedId,
            userId,
          });
        }

        const promptInput = buildEnrichmentPrompts({
          seed: seedDetail,
          snapshot: lexicalEvidence,
        });
        const modelResult = await measureAsync(() =>
          input.providers.modelProvider.generate(promptInput),
        );
        const guardedPayload = applyEnrichmentGuardrails({
          payload: modelResult.value,
          seedWord: seedDetail.word,
          snapshot: lexicalEvidence,
        });
        const readyRow = await seedEnrichmentRepository.markReady({
          enrichmentId: pendingEnrichment.id,
          guardrailFlags: guardedPayload.guardrailFlags,
          model: input.providers.modelProvider.model,
          payload: guardedPayload.payload,
          provider: input.providers.modelProvider.provider,
          seedId,
          userId,
        });

        try {
          await seedEnrichmentRepository.createTrace({
            guardrailFlags: guardedPayload.guardrailFlags,
            lexicalEvidence,
            model: input.providers.modelProvider.model,
            outputRedacted: redactTraceOutput({
              payload: guardedPayload.payload,
            }),
            promptTemplateVersion: seedEnrichmentPromptTemplateVersion,
            provider: input.providers.modelProvider.provider,
            schemaVersion: readyRow.schemaVersion,
            seedEnrichmentId: readyRow.id,
            seedId,
            status: readyRow.status,
            userId,
            validationResult: {
              accepted: true,
              issues: [],
            },
          });
        } catch (traceError) {
          logTracePersistenceFailure({
            error: traceError,
            logger: input.logger,
            requestId,
            seedId,
            status: "ready",
          });
        }

        input.logger.info("enrichment.completed", {
          ...logContext,
          guardrailFlags: guardedPayload.guardrailFlags.join(",") || "none",
          modelLatencyMs: modelResult.latencyMs,
          status: readyRow.status,
          toolCalls: 3,
          totalLatencyMs: Date.now() - startedAt,
          validationOutcome: "accepted",
        });

        return toSeedEnrichment(readyRow);
      } catch (error) {
        const failure = toFailureError(error, requestId);

        return await persistFailedEnrichment({
          enrichmentId: pendingEnrichment.id,
          failure,
          lexicalEvidence,
          requestId,
          seedId,
          userId,
        });
      }
    },
  };
};

export const createDefaultEnrichmentService = (input: {
  db: GlossDatabase;
  env: ServerEnv;
  logger: Logger;
  pool: Pool;
  providers?: EnrichmentProviders;
  requestRateLimitService: RequestRateLimitService;
}): EnrichmentService =>
  createEnrichmentService({
    db: input.db,
    logger: input.logger,
    pool: input.pool,
    providers: input.providers ?? createEnrichmentProviders(input.env),
    requestRateLimitService: input.requestRateLimitService,
  });

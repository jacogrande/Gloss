import type { ServerEnv } from "@gloss/shared/env";
import { ZodError } from "zod";

import {
  enrichmentEvidenceUnavailableError,
  enrichmentProviderError,
  enrichmentSchemaInvalidError,
  isAppError,
  notFoundError,
} from "@gloss/shared/errors";
import type { SeedEnrichment } from "@gloss/shared/types";

import type { Logger } from "../lib/logger";
import type { GlossDatabase } from "../lib/db";
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

export const createEnrichmentService = (input: {
  db: GlossDatabase;
  logger: Logger;
  providers: EnrichmentProviders;
  repository?: SeedRepository;
  seedEnrichmentRepository?: SeedEnrichmentRepository;
}): EnrichmentService => {
  const repository = input.repository ?? createSeedRepository(input.db);
  const seedEnrichmentRepository =
    input.seedEnrichmentRepository ?? createSeedEnrichmentRepository(input.db);

  return {
    async requestSeedEnrichment({ requestId, seedId, userId }) {
      const currentEnrichment =
        await seedEnrichmentRepository.getCurrentForSeed({ seedId, userId });

      if (currentEnrichment?.status === "ready") {
        return toSeedEnrichment(currentEnrichment);
      }

      if (currentEnrichment?.status === "pending") {
        return toSeedEnrichment(currentEnrichment);
      }

      const detailRecord = await repository.getSeedDetail({
        seedId,
        userId,
      });

      if (!detailRecord) {
        throw notFoundError("Seed not found.", requestId);
      }

      const seedDetail = toSeedDetail({
        ...detailRecord,
        enrichment: currentEnrichment,
      });
      const pendingEnrichment = await seedEnrichmentRepository.markPending({
        model: input.providers.modelProvider.model,
        promptTemplateVersion: seedEnrichmentPromptTemplateVersion,
        provider: input.providers.modelProvider.provider,
        schemaVersion: "seed-enrichment-payload.v1",
        seedId,
        userId,
      });

      const relationCandidates =
        await input.providers.lexicalEvidenceProvider.getRelationCandidates(
          seedDetail.word,
        );
      const dictionaryEntry =
        await input.providers.lexicalEvidenceProvider.getDictionaryEntry(
          seedDetail.word,
        );
      const lexicalEvidence = buildLexicalEvidenceSnapshot({
        dictionary: dictionaryEntry ?? createEmptyDictionaryEvidence(seedDetail.word),
        relations: relationCandidates,
        seed: seedDetail,
      });

      if (!hasMinimumEvidenceForEnrichment(lexicalEvidence)) {
        const failure = enrichmentEvidenceUnavailableError(
          "Lexical evidence was too weak to generate a safe enrichment.",
          requestId,
        );
        const failedRow = await seedEnrichmentRepository.markFailed({
          enrichmentId: pendingEnrichment.id,
          errorCode: failure.code,
          guardrailFlags: [],
          model: input.providers.modelProvider.model,
          provider: input.providers.modelProvider.provider,
          seedId,
          userId,
        });

        await seedEnrichmentRepository.createTrace({
          errorCode: failure.code,
          guardrailFlags: [],
          lexicalEvidence,
          model: input.providers.modelProvider.model,
          outputRedacted: redactTraceOutput({ errorCode: failure.code }),
          promptTemplateVersion: seedEnrichmentPromptTemplateVersion,
          provider: input.providers.modelProvider.provider,
          schemaVersion: failedRow.schemaVersion,
          seedEnrichmentId: failedRow.id,
          seedId,
          status: failedRow.status,
          userId,
          validationResult: {
            accepted: false,
            issues: [failure.message],
          },
        });

        input.logger.warn("enrichment.failed", {
          errorCode: failure.code,
          model: input.providers.modelProvider.model,
          provider: input.providers.modelProvider.provider,
          requestId,
          seedId,
          status: failedRow.status,
          userId,
        });

        return toSeedEnrichment(failedRow);
      }

      try {
        const modelPayload = await input.providers.modelProvider.generate(
          buildEnrichmentPrompts({
            seed: seedDetail,
            snapshot: lexicalEvidence,
          }),
        );
        const guardedPayload = applyEnrichmentGuardrails({
          payload: modelPayload,
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

        input.logger.info("enrichment.completed", {
          guardrailFlags: guardedPayload.guardrailFlags.join(",") || "none",
          model: input.providers.modelProvider.model,
          provider: input.providers.modelProvider.provider,
          requestId,
          seedId,
          status: readyRow.status,
          userId,
        });

        return toSeedEnrichment(readyRow);
      } catch (error) {
        const failure = toFailureError(error, requestId);
        const failedRow = await seedEnrichmentRepository.markFailed({
          enrichmentId: pendingEnrichment.id,
          errorCode: failure.code,
          guardrailFlags: [],
          model: input.providers.modelProvider.model,
          provider: input.providers.modelProvider.provider,
          seedId,
          userId,
        });

        await seedEnrichmentRepository.createTrace({
          errorCode: failure.code,
          guardrailFlags: [],
          lexicalEvidence,
          model: input.providers.modelProvider.model,
          outputRedacted: redactTraceOutput({
            errorCode: failure.code,
          }),
          promptTemplateVersion: seedEnrichmentPromptTemplateVersion,
          provider: input.providers.modelProvider.provider,
          schemaVersion: failedRow.schemaVersion,
          seedEnrichmentId: failedRow.id,
          seedId,
          status: failedRow.status,
          userId,
          validationResult: {
            accepted: false,
            issues: [failure.message],
          },
        });

        input.logger.error("enrichment.failed", {
          errorCode: failure.code,
          model: input.providers.modelProvider.model,
          provider: input.providers.modelProvider.provider,
          requestId,
          seedId,
          status: failedRow.status,
          userId,
        });

        return toSeedEnrichment(failedRow);
      }
    },
  };
};

export const createDefaultEnrichmentService = (input: {
  db: GlossDatabase;
  env: ServerEnv;
  logger: Logger;
}): EnrichmentService =>
  createEnrichmentService({
    db: input.db,
    logger: input.logger,
    providers: createEnrichmentProviders(input.env),
  });

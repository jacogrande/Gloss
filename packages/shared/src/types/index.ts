import type { z } from "zod";

import {
  createSeedInputSchema,
  healthDataSchema,
  lexicalEvidenceSnapshotSchema,
  listSeedsDataSchema,
  listSeedsQuerySchema,
  profileSchema,
  productEventSchema,
  productEventTypeSchema,
  reviewAnswerKeySchema,
  reviewCardPromptPayloadSchema,
  reviewCardSchema,
  reviewCardStatusSchema,
  reviewDimensionSchema,
  reviewExerciseTypeSchema,
  reviewGenerationSourceSchema,
  reviewOutcomeSchema,
  reviewQueueSummarySchema,
  reviewSessionDetailSchema,
  reviewSessionStatusSchema,
  reviewSessionSummarySchema,
  reviewStateDimensionSchema,
  reviewStateSchema,
  reviewSubmissionInputSchema,
  reviewSubmissionResultSchema,
  seedContextSchema,
  seedContextKindSchema,
  seedDetailSchema,
  seedEnrichmentGuardrailFlagSchema,
  seedEnrichmentMorphologySchema,
  seedEnrichmentModelPayloadSchema,
  seedEnrichmentPayloadSchema,
  seedEnrichmentRelationSchema,
  seedEnrichmentSchema,
  seedEnrichmentStatusSchema,
  seedStageSchema,
  seedSummarySchema,
  sessionDataSchema,
  sessionRecordSchema,
  sessionUserSchema,
  sourceKindSchema,
  sourceSummarySchema,
} from "../contracts/index";
import type { ApiErrorCode } from "../errors/index";
import { apiErrorSchema } from "../schemas/index";

export type ApiError = z.infer<typeof apiErrorSchema>;
export type { ApiErrorCode };

export type CreateSeedInput = z.infer<typeof createSeedInputSchema>;

export type HealthData = z.infer<typeof healthDataSchema>;

export type ListSeedsData = z.infer<typeof listSeedsDataSchema>;

export type ListSeedsQuery = z.infer<typeof listSeedsQuerySchema>;

export type LexicalEvidenceSnapshot = z.infer<
  typeof lexicalEvidenceSnapshotSchema
>;

export type Profile = z.infer<typeof profileSchema>;

export type ProductEvent = z.infer<typeof productEventSchema>;

export type ProductEventType = z.infer<typeof productEventTypeSchema>;

export type ReviewAnswerKey = z.infer<typeof reviewAnswerKeySchema>;

export type ReviewCard = z.infer<typeof reviewCardSchema>;

export type ReviewCardPromptPayload = z.infer<typeof reviewCardPromptPayloadSchema>;

export type ReviewCardStatus = z.infer<typeof reviewCardStatusSchema>;

export type ReviewDimension = z.infer<typeof reviewDimensionSchema>;

export type ReviewExerciseType = z.infer<typeof reviewExerciseTypeSchema>;

export type ReviewGenerationSource = z.infer<typeof reviewGenerationSourceSchema>;

export type ReviewOutcome = z.infer<typeof reviewOutcomeSchema>;

export type ReviewQueueSummary = z.infer<typeof reviewQueueSummarySchema>;

export type ReviewSessionDetail = z.infer<typeof reviewSessionDetailSchema>;

export type ReviewSessionStatus = z.infer<typeof reviewSessionStatusSchema>;

export type ReviewSessionSummary = z.infer<typeof reviewSessionSummarySchema>;

export type ReviewState = z.infer<typeof reviewStateSchema>;

export type ReviewStateDimension = z.infer<typeof reviewStateDimensionSchema>;

export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionInputSchema>;

export type ReviewSubmissionResult = z.infer<typeof reviewSubmissionResultSchema>;

export type SeedContext = z.infer<typeof seedContextSchema>;

export type SeedContextKind = z.infer<typeof seedContextKindSchema>;

export type SeedDetail = z.infer<typeof seedDetailSchema>;

export type SeedEnrichment = z.infer<typeof seedEnrichmentSchema>;

export type SeedEnrichmentGuardrailFlag = z.infer<
  typeof seedEnrichmentGuardrailFlagSchema
>;

export type SeedEnrichmentMorphology = z.infer<
  typeof seedEnrichmentMorphologySchema
>;

export type SeedEnrichmentModelPayload = z.infer<
  typeof seedEnrichmentModelPayloadSchema
>;

export type SeedEnrichmentPayload = z.infer<
  typeof seedEnrichmentPayloadSchema
>;

export type SeedEnrichmentRelation = z.infer<
  typeof seedEnrichmentRelationSchema
>;

export type SeedEnrichmentStatus = z.infer<
  typeof seedEnrichmentStatusSchema
>;

export type SeedStage = z.infer<typeof seedStageSchema>;

export type SeedSummary = z.infer<typeof seedSummarySchema>;

export type SessionData = z.infer<typeof sessionDataSchema>;

export type SessionRecord = z.infer<typeof sessionRecordSchema>;

export type SessionUser = z.infer<typeof sessionUserSchema>;

export type SourceKind = z.infer<typeof sourceKindSchema>;

export type SourceSummary = z.infer<typeof sourceSummarySchema>;

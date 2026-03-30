import { z } from "zod";

import { apiErrorCodeSchema } from "../errors/index";
import { apiTimestampSchema, createApiSuccessSchema } from "../schemas/index";
import {
  reviewCardStatusValues,
  reviewDimensionValues,
  reviewExerciseTypeValues,
  reviewGenerationSourceValues,
  reviewOutcomeValues,
  reviewSessionStatusValues,
  seedContextKindValues,
  seedEnrichmentGuardrailFlagValues,
  seedEnrichmentStatusValues,
  seedStageValues,
  sourceKindValues,
} from "../values/index";

const wordSchema = z.string().trim().min(1).max(160);
const optionalSentenceSchema = z.string().trim().min(1).max(2_000).optional();
const optionalTitleSchema = z.string().trim().min(1).max(240).optional();
const optionalAuthorSchema = z.string().trim().min(1).max(160).optional();
const conciseNoteSchema = z.string().trim().min(1).max(240);
const conciseGlossSchema = z.string().trim().min(1).max(320);

export const healthDataSchema = z.object({
  service: z.literal("api"),
  status: z.literal("ok"),
  timestamp: apiTimestampSchema,
});

export const healthResponseSchema = createApiSuccessSchema(healthDataSchema);

export const sessionUserSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  image: z.url().nullable(),
  name: z.string().min(1),
});

export const sessionRecordSchema = z.object({
  expiresAt: apiTimestampSchema,
  id: z.string().min(1),
  userId: z.string().min(1),
});

export const profileSchema = z.object({
  createdAt: apiTimestampSchema,
  updatedAt: apiTimestampSchema,
  userId: z.string().min(1),
});

export const sessionDataSchema = z.object({
  profile: profileSchema.nullable(),
  session: sessionRecordSchema,
  user: sessionUserSchema,
});

export const sessionResponseSchema = createApiSuccessSchema(sessionDataSchema);

export const seedStageSchema = z.enum(seedStageValues);

export const sourceKindSchema = z.enum(sourceKindValues);

export const seedContextKindSchema = z.enum(seedContextKindValues);

export const sourceSummarySchema = z.object({
  author: z.string().min(1).nullable(),
  id: z.string().min(1),
  kind: sourceKindSchema,
  title: z.string().min(1).nullable(),
  url: z.url().nullable(),
});

export const seedContextSchema = z.object({
  createdAt: apiTimestampSchema,
  id: z.string().min(1),
  isPrimary: z.boolean(),
  kind: seedContextKindSchema,
  text: z.string().min(1),
});

export const seedEnrichmentStatusSchema = z.enum(seedEnrichmentStatusValues);

export const seedEnrichmentGuardrailFlagSchema = z.enum(
  seedEnrichmentGuardrailFlagValues,
);

export const seedEnrichmentRelationSchema = z
  .object({
    note: conciseNoteSchema,
    word: wordSchema,
  })
  .strict();

export const seedEnrichmentMorphologySchema = z
  .object({
    note: conciseNoteSchema,
  })
  .strict();

export const seedEnrichmentPayloadSchemaVersion = "seed-enrichment-payload.v1";

export const seedEnrichmentPayloadSchema = z
  .object({
    contrastiveWord: seedEnrichmentRelationSchema.optional(),
    gloss: conciseGlossSchema,
    morphologyNote: seedEnrichmentMorphologySchema.optional(),
    registerNote: conciseNoteSchema.optional(),
    relatedWord: seedEnrichmentRelationSchema.optional(),
  })
  .strict();

export const seedEnrichmentModelPayloadSchema = z
  .object({
    contrastiveWord: seedEnrichmentRelationSchema.nullable(),
    gloss: conciseGlossSchema,
    morphologyNote: seedEnrichmentMorphologySchema.nullable(),
    registerNote: conciseNoteSchema.nullable(),
    relatedWord: seedEnrichmentRelationSchema.nullable(),
  })
  .strict();

export const seedEnrichmentPayloadJsonSchema = z.toJSONSchema(
  seedEnrichmentModelPayloadSchema,
);

export const normalizeSeedEnrichmentModelPayload = (
  input: unknown,
): z.infer<typeof seedEnrichmentPayloadSchema> => {
  const parsed = seedEnrichmentModelPayloadSchema.parse(input);

  return seedEnrichmentPayloadSchema.parse({
    ...(parsed.contrastiveWord
      ? {
          contrastiveWord: parsed.contrastiveWord,
        }
      : {}),
    gloss: parsed.gloss,
    ...(parsed.morphologyNote
      ? {
          morphologyNote: parsed.morphologyNote,
        }
      : {}),
    ...(parsed.registerNote
      ? {
          registerNote: parsed.registerNote,
        }
      : {}),
    ...(parsed.relatedWord
      ? {
          relatedWord: parsed.relatedWord,
        }
      : {}),
  });
};

export const lexicalEvidenceSnapshotSchema = z
  .object({
    capturedSentencePreview: z.string().trim().min(1).max(240).nullable(),
    contrastCandidates: z.array(wordSchema).max(6),
    dictionaryGlosses: z.array(conciseNoteSchema).max(6),
    exampleSentences: z.array(z.string().trim().min(1).max(240)).max(4),
    lemma: wordSchema,
    morphologyHints: z.array(conciseNoteSchema).max(4),
    partOfSpeech: z.string().trim().min(1).max(80).nullable(),
    registerLabels: z.array(z.string().trim().min(1).max(80)).max(4),
    relatedCandidates: z.array(wordSchema).max(6),
    sourceSummary: z
      .object({
        kind: sourceKindSchema.nullable(),
        title: z.string().trim().min(1).max(240).nullable(),
      })
      .strict(),
  })
  .strict();

export const seedEnrichmentSchema = z
  .object({
    completedAt: apiTimestampSchema.nullable(),
    createdAt: apiTimestampSchema,
    errorCode: apiErrorCodeSchema.nullable(),
    failedAt: apiTimestampSchema.nullable(),
    guardrailFlags: z.array(seedEnrichmentGuardrailFlagSchema),
    id: z.string().min(1),
    model: z.string().trim().min(1).nullable(),
    payload: seedEnrichmentPayloadSchema.nullable(),
    promptTemplateVersion: z.string().trim().min(1),
    provider: z.string().trim().min(1).nullable(),
    requestedAt: apiTimestampSchema,
    schemaVersion: z.string().trim().min(1),
    startedAt: apiTimestampSchema.nullable(),
    status: seedEnrichmentStatusSchema,
    updatedAt: apiTimestampSchema,
  })
  .strict();

export const reviewDimensionSchema = z.enum(reviewDimensionValues);

export const reviewExerciseTypeSchema = z.enum(reviewExerciseTypeValues);

export const reviewCardStatusSchema = z.enum(reviewCardStatusValues);

export const reviewSessionStatusSchema = z.enum(reviewSessionStatusValues);

export const reviewGenerationSourceSchema = z.enum(reviewGenerationSourceValues);

export const reviewOutcomeSchema = z.enum(reviewOutcomeValues);

export const reviewCardPromptPayloadSchemaVersion = "review-card-prompt.v1";

export const reviewChoiceSchema = z
  .object({
    detail: conciseNoteSchema.optional(),
    id: z.string().trim().min(1).max(80),
    label: z.string().trim().min(1).max(320),
  })
  .strict();

const reviewBaseCardPromptSchema = z
  .object({
    question: z.string().trim().min(1).max(320),
    word: wordSchema,
  })
  .strict();

export const reviewMeaningInContextCardPromptSchema = reviewBaseCardPromptSchema
  .extend({
    choices: z.array(reviewChoiceSchema).min(3).max(4),
    sentence: z.string().trim().min(1).max(320),
    type: z.literal("meaning_in_context"),
  })
  .strict();

export const reviewRecognitionFreshSentenceCardPromptSchema =
  reviewBaseCardPromptSchema
    .extend({
      choices: z.array(reviewChoiceSchema).min(3).max(4),
      sentence: z.string().trim().min(1).max(320),
      type: z.literal("recognition_in_fresh_sentence"),
    })
    .strict();

export const reviewContrastiveChoiceCardPromptSchema =
  reviewBaseCardPromptSchema
    .extend({
      choices: z.array(reviewChoiceSchema).length(2),
      sentence: z.string().trim().min(1).max(320),
      type: z.literal("contrastive_choice"),
    })
    .strict();

export const reviewRegisterJudgmentCardPromptSchema = reviewBaseCardPromptSchema
  .extend({
    choices: z.array(reviewChoiceSchema).length(2),
    type: z.literal("register_judgment"),
  })
  .strict();

export const reviewCardPromptPayloadSchema = z.discriminatedUnion("type", [
  reviewMeaningInContextCardPromptSchema,
  reviewRecognitionFreshSentenceCardPromptSchema,
  reviewContrastiveChoiceCardPromptSchema,
  reviewRegisterJudgmentCardPromptSchema,
]);

export const reviewRecognitionFreshSentencePromptJsonSchema = z.toJSONSchema(
  reviewRecognitionFreshSentenceCardPromptSchema,
);

export const reviewRecognitionFreshSentenceModelOutputSchema = z
  .object({
    correctChoiceId: z.string().trim().min(1).max(80),
    promptPayload: reviewRecognitionFreshSentenceCardPromptSchema,
  })
  .superRefine((value, context) => {
    const choiceIds = value.promptPayload.choices.map((choice) => choice.id);

    if (!choiceIds.includes(value.correctChoiceId)) {
      context.addIssue({
        code: "custom",
        message:
          "correctChoiceId must match one of the prompt payload choice ids.",
        path: ["correctChoiceId"],
      });
    }

    if (new Set(choiceIds).size !== choiceIds.length) {
      context.addIssue({
        code: "custom",
        message: "Choice ids must be unique within a review card.",
        path: ["promptPayload", "choices"],
      });
    }
  })
  .strict();

export const reviewRecognitionFreshSentenceModelOutputJsonSchema =
  z.toJSONSchema(reviewRecognitionFreshSentenceModelOutputSchema);

export const reviewAnswerKeySchema = z
  .object({
    correctChoiceId: z.string().trim().min(1).max(80),
  })
  .strict();

export const reviewStateDimensionSchema = z
  .object({
    dueAt: apiTimestampSchema,
    score: z.number().int().min(0).max(3),
  })
  .strict();

export const reviewStateSchema = z
  .object({
    createdAt: apiTimestampSchema,
    distinction: reviewStateDimensionSchema,
    id: z.string().min(1),
    lastReviewedAt: apiTimestampSchema.nullable(),
    lastSessionId: z.string().min(1).nullable(),
    recognition: reviewStateDimensionSchema,
    schedulerVersion: z.string().trim().min(1),
    seedId: z.string().min(1),
    updatedAt: apiTimestampSchema,
    usage: reviewStateDimensionSchema,
  })
  .strict();

export const reviewQueueSummarySchema = z
  .object({
    activeSessionId: z.string().min(1).nullable(),
    availableCount: z.number().int().nonnegative(),
    dueByDimension: z
      .object({
        distinction: z.number().int().nonnegative(),
        recognition: z.number().int().nonnegative(),
        usage: z.number().int().nonnegative(),
      })
      .strict(),
    dueCount: z.number().int().nonnegative(),
  })
  .strict();

export const reviewSessionSummarySchema = z
  .object({
    cardCount: z.number().int().nonnegative(),
    completedAt: apiTimestampSchema.nullable(),
    currentCardId: z.string().min(1).nullable(),
    id: z.string().min(1),
    remainingCount: z.number().int().nonnegative(),
    startedAt: apiTimestampSchema,
    status: reviewSessionStatusSchema,
  })
  .strict();

export const reviewCardSchema = z
  .object({
    dimension: reviewDimensionSchema,
    exerciseType: reviewExerciseTypeSchema,
    generationSource: reviewGenerationSourceSchema,
    id: z.string().min(1),
    position: z.number().int().nonnegative(),
    promptPayload: reviewCardPromptPayloadSchema,
    status: reviewCardStatusSchema,
  })
  .strict();

export const reviewSessionDetailSchema = z
  .object({
    cards: z.array(reviewCardSchema),
    session: reviewSessionSummarySchema,
  })
  .strict();

export const reviewSubmissionInputSchema = z
  .object({
    choiceId: z.string().trim().min(1).max(80),
    latencyMs: z.number().int().min(0).max(600_000).optional(),
  })
  .strict();

export const reviewSubmissionResultSchema = z
  .object({
    cardId: z.string().min(1),
    correct: z.boolean(),
    outcome: reviewOutcomeSchema,
    seedStage: seedStageSchema,
  })
  .strict();

export const seedSummarySchema = z.object({
  createdAt: apiTimestampSchema,
  id: z.string().min(1),
  primarySentence: z.string().min(1).nullable(),
  source: sourceSummarySchema.nullable(),
  stage: seedStageSchema,
  updatedAt: apiTimestampSchema,
  word: wordSchema,
});

export const seedDetailSchema = seedSummarySchema.extend({
  contexts: z.array(seedContextSchema),
  enrichment: seedEnrichmentSchema.nullable(),
});

export const listSeedsDataSchema = z.object({
  items: z.array(seedSummarySchema),
  total: z.number().int().nonnegative(),
});

export const sourceInputSchema = z
  .object({
    author: optionalAuthorSchema,
    kind: sourceKindSchema,
    title: optionalTitleSchema,
    url: z.url().optional(),
  })
  .superRefine((value, context) => {
    if (value.author || value.title || value.url) {
      return;
    }

    context.addIssue({
      code: "custom",
      message:
        "Source metadata must include at least a title, author, or URL when a source is provided.",
      path: ["title"],
    });
  });

export const createSeedInputSchema = z.object({
  sentence: optionalSentenceSchema,
  source: sourceInputSchema.optional(),
  word: wordSchema,
});

export const listSeedsQuerySchema = z.object({
  stage: seedStageSchema.optional(),
});

export const requestSeedEnrichmentInputSchema = z.object({}).strict();

export const createSeedResponseSchema = createApiSuccessSchema(seedDetailSchema);

export const seedDetailResponseSchema = createApiSuccessSchema(seedDetailSchema);

export const seedListResponseSchema = createApiSuccessSchema(listSeedsDataSchema);

export const requestSeedEnrichmentResponseSchema = createApiSuccessSchema(
  seedEnrichmentSchema,
);

export const reviewQueueResponseSchema = createApiSuccessSchema(
  reviewQueueSummarySchema,
);

export const createReviewSessionInputSchema = z
  .object({
    limit: z.number().int().min(1).max(5).optional(),
  })
  .strict();

export const reviewSessionResponseSchema = createApiSuccessSchema(
  reviewSessionDetailSchema,
);

export const submitReviewCardResponseSchema = createApiSuccessSchema(
  z
    .object({
      result: reviewSubmissionResultSchema,
      session: reviewSessionDetailSchema,
    })
    .strict(),
);

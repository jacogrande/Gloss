import { z } from "zod";

import { apiErrorCodeSchema } from "../errors/index";
import { apiTimestampSchema, createApiSuccessSchema } from "../schemas/index";

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

export const seedStageSchema = z.enum([
  "new",
  "stabilizing",
  "deepening",
  "mature",
]);

export const sourceKindSchema = z.enum([
  "manual",
  "article",
  "book",
  "other",
]);

export const seedContextKindSchema = z.enum(["sentence"]);

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

export const seedEnrichmentStatusSchema = z.enum([
  "pending",
  "ready",
  "failed",
]);

export const seedEnrichmentGuardrailFlagSchema = z.enum([
  "contrast_omitted_weak_evidence",
  "morphology_omitted_weak_evidence",
  "register_omitted_weak_evidence",
  "related_omitted_weak_evidence",
]);

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

export const seedEnrichmentPayloadJsonSchema = {
  additionalProperties: false,
  properties: {
    contrastiveWord: {
      additionalProperties: false,
      properties: {
        note: {
          maxLength: 240,
          minLength: 1,
          type: "string",
        },
        word: {
          maxLength: 160,
          minLength: 1,
          type: "string",
        },
      },
      required: ["word", "note"],
      type: "object",
    },
    gloss: {
      maxLength: 320,
      minLength: 1,
      type: "string",
    },
    morphologyNote: {
      additionalProperties: false,
      properties: {
        note: {
          maxLength: 240,
          minLength: 1,
          type: "string",
        },
      },
      required: ["note"],
      type: "object",
    },
    registerNote: {
      maxLength: 240,
      minLength: 1,
      type: "string",
    },
    relatedWord: {
      additionalProperties: false,
      properties: {
        note: {
          maxLength: 240,
          minLength: 1,
          type: "string",
        },
        word: {
          maxLength: 160,
          minLength: 1,
          type: "string",
        },
      },
      required: ["word", "note"],
      type: "object",
    },
  },
  required: ["gloss"],
  type: "object",
} as const;

export const seedEnrichmentPayloadSchema = z
  .object({
    contrastiveWord: seedEnrichmentRelationSchema.optional(),
    gloss: conciseGlossSchema,
    morphologyNote: seedEnrichmentMorphologySchema.optional(),
    registerNote: conciseNoteSchema.optional(),
    relatedWord: seedEnrichmentRelationSchema.optional(),
  })
  .strict();

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

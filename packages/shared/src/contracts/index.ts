import { z } from "zod";

import { apiTimestampSchema, createApiSuccessSchema } from "../schemas/index";

const wordSchema = z.string().trim().min(1).max(160);
const optionalSentenceSchema = z.string().trim().min(1).max(2_000).optional();
const optionalTitleSchema = z.string().trim().min(1).max(240).optional();
const optionalAuthorSchema = z.string().trim().min(1).max(160).optional();

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

export const createSeedResponseSchema = createApiSuccessSchema(seedDetailSchema);

export const seedDetailResponseSchema = createApiSuccessSchema(seedDetailSchema);

export const seedListResponseSchema = createApiSuccessSchema(listSeedsDataSchema);

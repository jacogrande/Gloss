import type { z } from "zod";

import {
  createSeedInputSchema,
  healthDataSchema,
  listSeedsDataSchema,
  listSeedsQuerySchema,
  profileSchema,
  seedContextSchema,
  seedContextKindSchema,
  seedDetailSchema,
  seedStageSchema,
  seedSummarySchema,
  sessionDataSchema,
  sessionRecordSchema,
  sessionUserSchema,
  sourceKindSchema,
  sourceSummarySchema,
} from "../contracts/index";
import { apiErrorSchema } from "../schemas/index";

export type ApiError = z.infer<typeof apiErrorSchema>;

export type CreateSeedInput = z.infer<typeof createSeedInputSchema>;

export type HealthData = z.infer<typeof healthDataSchema>;

export type ListSeedsData = z.infer<typeof listSeedsDataSchema>;

export type ListSeedsQuery = z.infer<typeof listSeedsQuerySchema>;

export type Profile = z.infer<typeof profileSchema>;

export type SeedContext = z.infer<typeof seedContextSchema>;

export type SeedContextKind = z.infer<typeof seedContextKindSchema>;

export type SeedDetail = z.infer<typeof seedDetailSchema>;

export type SeedStage = z.infer<typeof seedStageSchema>;

export type SeedSummary = z.infer<typeof seedSummarySchema>;

export type SessionData = z.infer<typeof sessionDataSchema>;

export type SessionRecord = z.infer<typeof sessionRecordSchema>;

export type SessionUser = z.infer<typeof sessionUserSchema>;

export type SourceKind = z.infer<typeof sourceKindSchema>;

export type SourceSummary = z.infer<typeof sourceSummarySchema>;

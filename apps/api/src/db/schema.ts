import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import type {
  ApiErrorCode,
  LexicalEvidenceSnapshot,
  ProductEvent,
  ProductEventType,
  ReviewAnswerKey,
  ReviewCardPromptPayload,
  ReviewCardStatus,
  ReviewDimension,
  ReviewExerciseType,
  ReviewGenerationSource,
  ReviewOutcome,
  ReviewSessionStatus,
  SeedContextKind,
  SeedEnrichmentGuardrailFlag,
  SeedEnrichmentPayload,
  SeedEnrichmentStatus,
  SeedStage,
  SourceKind,
} from "@gloss/shared/types";

export const profilesTable = pgTable("profiles", {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  userId: text("user_id").primaryKey(),
});

export type ProfileRow = typeof profilesTable.$inferSelect;

export const authUsersTable = pgTable("user", {
  id: text("id").primaryKey(),
});

export const sourcesTable = pgTable(
  "sources",
  {
    author: text("author"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    id: text("id").primaryKey(),
    kind: text("kind").$type<SourceKind>().notNull(),
    title: text("title"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    url: text("url"),
    userId: text("user_id")
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
  },
  (table) => ({
    userIdIndex: index("sources_user_id_idx").on(table.userId),
  }),
);

export type SourceRow = typeof sourcesTable.$inferSelect;

export const seedsTable = pgTable(
  "seeds",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    id: text("id").primaryKey(),
    normalizedWord: text("normalized_word").notNull(),
    sourceId: text("source_id").references(() => sourcesTable.id, {
      onDelete: "set null",
    }),
    stage: text("stage").$type<SeedStage>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
    word: text("word").notNull(),
  },
  (table) => ({
    normalizedWordIndex: index("seeds_normalized_word_idx").on(
      table.normalizedWord,
    ),
    sourceIdIndex: index("seeds_source_id_idx").on(table.sourceId),
    stageIndex: index("seeds_stage_idx").on(table.stage),
    userIdIndex: index("seeds_user_id_idx").on(table.userId),
  }),
);

export type SeedRow = typeof seedsTable.$inferSelect;

export const seedContextsTable = pgTable(
  "seed_contexts",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    id: text("id").primaryKey(),
    isPrimary: boolean("is_primary").default(true).notNull(),
    kind: text("kind").$type<SeedContextKind>().notNull(),
    seedId: text("seed_id")
      .notNull()
      .references(() => seedsTable.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
  },
  (table) => ({
    seedIdIndex: index("seed_contexts_seed_id_idx").on(table.seedId),
  }),
);

export type SeedContextRow = typeof seedContextsTable.$inferSelect;

type SeedEnrichmentTraceOutput = Record<string, unknown> | null;

type SeedEnrichmentValidationResult = {
  accepted: boolean;
  issues: string[];
};

export const seedEnrichmentsTable = pgTable(
  "seed_enrichments",
  {
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    errorCode: text("error_code").$type<ApiErrorCode>(),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    guardrailFlags: jsonb("guardrail_flags")
      .$type<SeedEnrichmentGuardrailFlag[]>()
      .notNull(),
    id: text("id").primaryKey(),
    model: text("model"),
    payload: jsonb("payload").$type<SeedEnrichmentPayload>(),
    promptTemplateVersion: text("prompt_template_version").notNull(),
    provider: text("provider"),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    schemaVersion: text("schema_version").notNull(),
    seedId: text("seed_id")
      .notNull()
      .references(() => seedsTable.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    status: text("status").$type<SeedEnrichmentStatus>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
  },
  (table) => ({
    seedIdUniqueIndex: uniqueIndex("seed_enrichments_seed_id_uidx").on(
      table.seedId,
    ),
    statusIndex: index("seed_enrichments_status_idx").on(table.status),
    userIdIndex: index("seed_enrichments_user_id_idx").on(table.userId),
  }),
);

export type SeedEnrichmentRow = typeof seedEnrichmentsTable.$inferSelect;

export const seedEnrichmentTracesTable = pgTable(
  "seed_enrichment_traces",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    errorCode: text("error_code").$type<ApiErrorCode>(),
    guardrailFlags: jsonb("guardrail_flags")
      .$type<SeedEnrichmentGuardrailFlag[]>()
      .notNull(),
    id: text("id").primaryKey(),
    lexicalEvidence: jsonb("lexical_evidence")
      .$type<LexicalEvidenceSnapshot>()
      .notNull(),
    model: text("model"),
    outputRedacted: jsonb("output_redacted")
      .$type<SeedEnrichmentTraceOutput>()
      .notNull(),
    promptTemplateVersion: text("prompt_template_version").notNull(),
    provider: text("provider"),
    schemaVersion: text("schema_version").notNull(),
    seedEnrichmentId: text("seed_enrichment_id")
      .notNull()
      .references(() => seedEnrichmentsTable.id, { onDelete: "cascade" }),
    seedId: text("seed_id")
      .notNull()
      .references(() => seedsTable.id, { onDelete: "cascade" }),
    status: text("status").$type<SeedEnrichmentStatus>().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
    validationResult: jsonb("validation_result")
      .$type<SeedEnrichmentValidationResult>()
      .notNull(),
  },
  (table) => ({
    seedEnrichmentIdIndex: index(
      "seed_enrichment_traces_seed_enrichment_id_idx",
    ).on(table.seedEnrichmentId),
    seedIdIndex: index("seed_enrichment_traces_seed_id_idx").on(table.seedId),
    userIdIndex: index("seed_enrichment_traces_user_id_idx").on(table.userId),
  }),
);

export type SeedEnrichmentTraceRow = typeof seedEnrichmentTracesTable.$inferSelect;

type ReviewStateDelta = {
  nextDueAt: string;
  nextScore: number;
  previousDueAt: string;
  previousScore: number;
};

type ReviewTraceValidationResult = {
  accepted: boolean;
  issues: string[];
};

type ProductEventPayload = ProductEvent["payload"];

export const requestRateLimitsTable = pgTable(
  "request_rate_limits",
  {
    actorKey: text("actor_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    id: text("id").primaryKey(),
    policyKey: text("policy_key").notNull(),
    requestCount: integer("request_count").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    windowSeconds: integer("window_seconds").notNull(),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true })
      .notNull(),
  },
  (table) => ({
    actorPolicyWindowUniqueIndex: uniqueIndex(
      "request_rate_limits_actor_policy_window_uidx",
    ).on(table.actorKey, table.policyKey, table.windowStartedAt),
    actorPolicyIndex: index("request_rate_limits_actor_policy_idx").on(
      table.actorKey,
      table.policyKey,
    ),
    updatedAtIndex: index("request_rate_limits_updated_at_idx").on(table.updatedAt),
  }),
);

export type RequestRateLimitRow = typeof requestRateLimitsTable.$inferSelect;

export const reviewStatesTable = pgTable(
  "review_states",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    distinctionDueAt: timestamp("distinction_due_at", { withTimezone: true })
      .notNull(),
    distinctionScore: integer("distinction_score").notNull(),
    id: text("id").primaryKey(),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    lastSessionId: text("last_session_id"),
    recognitionDueAt: timestamp("recognition_due_at", { withTimezone: true })
      .notNull(),
    recognitionScore: integer("recognition_score").notNull(),
    schedulerVersion: text("scheduler_version").notNull(),
    seedId: text("seed_id")
      .notNull()
      .references(() => seedsTable.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    usageDueAt: timestamp("usage_due_at", { withTimezone: true }).notNull(),
    usageScore: integer("usage_score").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
  },
  (table) => ({
    dueIndex: index("review_states_due_idx").on(
      table.recognitionDueAt,
      table.distinctionDueAt,
      table.usageDueAt,
    ),
    seedUserUniqueIndex: uniqueIndex("review_states_seed_user_uidx").on(
      table.seedId,
      table.userId,
    ),
    userIdIndex: index("review_states_user_id_idx").on(table.userId),
  }),
);

export type ReviewStateRow = typeof reviewStatesTable.$inferSelect;

export const reviewSessionsTable = pgTable(
  "review_sessions",
  {
    cardCount: integer("card_count").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    id: text("id").primaryKey(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    status: text("status").$type<ReviewSessionStatus>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
  },
  (table) => ({
    activeUserUniqueIndex: uniqueIndex("review_sessions_active_user_uidx")
      .on(table.userId)
      .where(sql`${table.status} = 'active'`),
    statusIndex: index("review_sessions_status_idx").on(table.status),
    userIdIndex: index("review_sessions_user_id_idx").on(table.userId),
  }),
);

export type ReviewSessionRow = typeof reviewSessionsTable.$inferSelect;

export const productEventsTable = pgTable(
  "product_events",
  {
    actorTag: text("actor_tag").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    id: text("id").primaryKey(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    payload: jsonb("payload").$type<ProductEventPayload>().notNull(),
    reviewSessionId: text("review_session_id").references(() => reviewSessionsTable.id, {
      onDelete: "set null",
    }),
    schemaVersion: text("schema_version").notNull(),
    seedId: text("seed_id").references(() => seedsTable.id, {
      onDelete: "set null",
    }),
    sessionId: text("session_id"),
    type: text("type").$type<ProductEventType>().notNull(),
    userId: text("user_id").references(() => authUsersTable.id, {
      onDelete: "set null",
    }),
  },
  (table) => ({
    occurredAtIndex: index("product_events_occurred_at_idx").on(table.occurredAt),
    reviewSessionIdIndex: index("product_events_review_session_id_idx").on(
      table.reviewSessionId,
    ),
    seedIdIndex: index("product_events_seed_id_idx").on(table.seedId),
    typeIndex: index("product_events_type_idx").on(table.type),
    userIdIndex: index("product_events_user_id_idx").on(table.userId),
  }),
);

export type ProductEventRow = typeof productEventsTable.$inferSelect;

export const reviewCardsTable = pgTable(
  "review_cards",
  {
    answerKey: jsonb("answer_key").$type<ReviewAnswerKey>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    dimension: text("dimension").$type<ReviewDimension>().notNull(),
    exerciseType: text("exercise_type").$type<ReviewExerciseType>().notNull(),
    generationSource: text("generation_source")
      .$type<ReviewGenerationSource>()
      .notNull(),
    id: text("id").primaryKey(),
    model: text("model"),
    position: integer("position").notNull(),
    promptPayload: jsonb("prompt_payload")
      .$type<ReviewCardPromptPayload>()
      .notNull(),
    promptTemplateVersion: text("prompt_template_version").notNull(),
    provider: text("provider"),
    reviewSessionId: text("review_session_id")
      .notNull()
      .references(() => reviewSessionsTable.id, { onDelete: "cascade" }),
    schemaVersion: text("schema_version").notNull(),
    seedId: text("seed_id")
      .notNull()
      .references(() => seedsTable.id, { onDelete: "cascade" }),
    status: text("status").$type<ReviewCardStatus>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
  },
  (table) => ({
    sessionPositionUniqueIndex: uniqueIndex(
      "review_cards_session_position_uidx",
    ).on(table.reviewSessionId, table.position),
    sessionIdIndex: index("review_cards_session_id_idx").on(table.reviewSessionId),
    seedIdIndex: index("review_cards_seed_id_idx").on(table.seedId),
    statusIndex: index("review_cards_status_idx").on(table.status),
    userIdIndex: index("review_cards_user_id_idx").on(table.userId),
  }),
);

export type ReviewCardRow = typeof reviewCardsTable.$inferSelect;

export const reviewEventsTable = pgTable(
  "review_events",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    dimension: text("dimension").$type<ReviewDimension>().notNull(),
    exerciseType: text("exercise_type").$type<ReviewExerciseType>().notNull(),
    id: text("id").primaryKey(),
    outcome: text("outcome").$type<ReviewOutcome>().notNull(),
    responseLatencyMs: integer("response_latency_ms"),
    responsePayload: jsonb("response_payload")
      .$type<Record<string, unknown>>()
      .notNull(),
    reviewCardId: text("review_card_id")
      .notNull()
      .references(() => reviewCardsTable.id, { onDelete: "cascade" }),
    reviewSessionId: text("review_session_id")
      .notNull()
      .references(() => reviewSessionsTable.id, { onDelete: "cascade" }),
    seedId: text("seed_id")
      .notNull()
      .references(() => seedsTable.id, { onDelete: "cascade" }),
    stateDelta: jsonb("state_delta").$type<ReviewStateDelta>().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
  },
  (table) => ({
    cardUniqueIndex: uniqueIndex("review_events_card_uidx").on(table.reviewCardId),
    cardIdIndex: index("review_events_card_id_idx").on(table.reviewCardId),
    sessionIdIndex: index("review_events_session_id_idx").on(table.reviewSessionId),
    seedIdIndex: index("review_events_seed_id_idx").on(table.seedId),
    userIdIndex: index("review_events_user_id_idx").on(table.userId),
  }),
);

export type ReviewEventRow = typeof reviewEventsTable.$inferSelect;

export const reviewCardTracesTable = pgTable(
  "review_card_traces",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    generationSource: text("generation_source")
      .$type<ReviewGenerationSource>()
      .notNull(),
    id: text("id").primaryKey(),
    inputRedacted: jsonb("input_redacted").$type<Record<string, unknown> | null>(),
    model: text("model"),
    outputRedacted: jsonb("output_redacted")
      .$type<Record<string, unknown>>()
      .notNull(),
    promptTemplateVersion: text("prompt_template_version").notNull(),
    provider: text("provider"),
    reviewCardId: text("review_card_id")
      .notNull()
      .references(() => reviewCardsTable.id, { onDelete: "cascade" }),
    reviewSessionId: text("review_session_id")
      .notNull()
      .references(() => reviewSessionsTable.id, { onDelete: "cascade" }),
    schemaVersion: text("schema_version").notNull(),
    seedId: text("seed_id")
      .notNull()
      .references(() => seedsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
    validationResult: jsonb("validation_result")
      .$type<ReviewTraceValidationResult>()
      .notNull(),
  },
  (table) => ({
    cardUniqueIndex: uniqueIndex("review_card_traces_card_uidx").on(
      table.reviewCardId,
    ),
    seedIdIndex: index("review_card_traces_seed_id_idx").on(table.seedId),
    sessionIdIndex: index("review_card_traces_session_id_idx").on(
      table.reviewSessionId,
    ),
    userIdIndex: index("review_card_traces_user_id_idx").on(table.userId),
  }),
);

export type ReviewCardTraceRow = typeof reviewCardTracesTable.$inferSelect;

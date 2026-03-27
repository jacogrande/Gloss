import {
  boolean,
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

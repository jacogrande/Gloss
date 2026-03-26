import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import type {
  SeedContextKind,
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

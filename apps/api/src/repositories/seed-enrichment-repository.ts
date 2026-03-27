import {
  and,
  desc,
  eq,
  lt,
  ne,
  or,
} from "drizzle-orm";

import type {
  ApiErrorCode,
  LexicalEvidenceSnapshot,
  SeedEnrichmentGuardrailFlag,
  SeedEnrichmentPayload,
  SeedEnrichmentStatus,
} from "@gloss/shared/types";

import {
  seedEnrichmentTracesTable,
  seedEnrichmentsTable,
  type SeedEnrichmentRow,
  type SeedEnrichmentTraceRow,
} from "../db/schema";
import type { GlossDatabase } from "../lib/db";

type SeedEnrichmentValidationResult = {
  accepted: boolean;
  issues: string[];
};

export type SeedEnrichmentRepository = {
  acquirePending: (input: {
    model: string;
    promptTemplateVersion: string;
    provider: string;
    schemaVersion: string;
    seedId: string;
    staleBefore: Date;
    userId: string;
  }) => Promise<SeedEnrichmentRow | null>;
  createTrace: (input: {
    errorCode?: ApiErrorCode;
    guardrailFlags: SeedEnrichmentGuardrailFlag[];
    lexicalEvidence: LexicalEvidenceSnapshot;
    model: string;
    outputRedacted: Record<string, unknown> | null;
    promptTemplateVersion: string;
    provider: string;
    schemaVersion: string;
    seedEnrichmentId: string;
    seedId: string;
    status: SeedEnrichmentStatus;
    userId: string;
    validationResult: SeedEnrichmentValidationResult;
  }) => Promise<SeedEnrichmentTraceRow>;
  getCurrentForSeed: (input: {
    seedId: string;
    userId: string;
  }) => Promise<SeedEnrichmentRow | null>;
  getLatestTraceForSeed: (input: {
    seedId: string;
    userId: string;
  }) => Promise<SeedEnrichmentTraceRow | null>;
  markFailed: (input: {
    enrichmentId: string;
    errorCode: ApiErrorCode;
    guardrailFlags: SeedEnrichmentGuardrailFlag[];
    model: string;
    provider: string;
    seedId: string;
    userId: string;
  }) => Promise<SeedEnrichmentRow>;
  markReady: (input: {
    enrichmentId: string;
    guardrailFlags: SeedEnrichmentGuardrailFlag[];
    model: string;
    payload: SeedEnrichmentPayload;
    provider: string;
    seedId: string;
    userId: string;
  }) => Promise<SeedEnrichmentRow>;
};

const now = (): Date => new Date();

const requireRow = <TRow>(row: TRow | undefined, message: string): TRow => {
  if (!row) {
    throw new Error(message);
  }

  return row;
};

export const createSeedEnrichmentRepository = (
  db: GlossDatabase,
): SeedEnrichmentRepository => ({
  async acquirePending(input) {
    const timestamp = now();
    const reacquireWhere = or(
      ne(seedEnrichmentsTable.status, "pending"),
      lt(seedEnrichmentsTable.updatedAt, input.staleBefore),
    );
    const [row] = await db
      .insert(seedEnrichmentsTable)
      .values({
        guardrailFlags: [],
        id: crypto.randomUUID(),
        model: input.model,
        payload: null,
        promptTemplateVersion: input.promptTemplateVersion,
        provider: input.provider,
        requestedAt: timestamp,
        schemaVersion: input.schemaVersion,
        seedId: input.seedId,
        startedAt: timestamp,
        status: "pending",
        updatedAt: timestamp,
        userId: input.userId,
      })
      .onConflictDoUpdate({
        set: {
          completedAt: null,
          errorCode: null,
          failedAt: null,
          guardrailFlags: [],
          model: input.model,
          payload: null,
          promptTemplateVersion: input.promptTemplateVersion,
          provider: input.provider,
          requestedAt: timestamp,
          schemaVersion: input.schemaVersion,
          startedAt: timestamp,
          status: "pending",
          updatedAt: timestamp,
        },
        target: seedEnrichmentsTable.seedId,
        ...(reacquireWhere
          ? {
              setWhere: reacquireWhere,
            }
          : {}),
      })
      .returning();

    return row ?? null;
  },
  async createTrace(input) {
    const [createdTrace] = await db
      .insert(seedEnrichmentTracesTable)
      .values({
        errorCode: input.errorCode,
        guardrailFlags: input.guardrailFlags,
        id: crypto.randomUUID(),
        lexicalEvidence: input.lexicalEvidence,
        model: input.model,
        outputRedacted: input.outputRedacted,
        promptTemplateVersion: input.promptTemplateVersion,
        provider: input.provider,
        schemaVersion: input.schemaVersion,
        seedEnrichmentId: input.seedEnrichmentId,
        seedId: input.seedId,
        status: input.status,
        userId: input.userId,
        validationResult: input.validationResult,
      })
      .returning();

    return requireRow(createdTrace, "Seed enrichment trace was not created.");
  },
  async getCurrentForSeed(input) {
    const [row] = await db
      .select()
      .from(seedEnrichmentsTable)
      .where(
        and(
          eq(seedEnrichmentsTable.seedId, input.seedId),
          eq(seedEnrichmentsTable.userId, input.userId),
        ),
      )
      .limit(1);

    return row ?? null;
  },
  async getLatestTraceForSeed(input) {
    const [row] = await db
      .select()
      .from(seedEnrichmentTracesTable)
      .where(
        and(
          eq(seedEnrichmentTracesTable.seedId, input.seedId),
          eq(seedEnrichmentTracesTable.userId, input.userId),
        ),
      )
      .orderBy(desc(seedEnrichmentTracesTable.createdAt))
      .limit(1);

    return row ?? null;
  },
  async markFailed(input) {
    const [updatedRow] = await db
      .update(seedEnrichmentsTable)
      .set({
        completedAt: null,
        errorCode: input.errorCode,
        failedAt: now(),
        guardrailFlags: input.guardrailFlags,
        model: input.model,
        payload: null,
        provider: input.provider,
        startedAt: null,
        status: "failed",
        updatedAt: now(),
      })
      .where(
        and(
          eq(seedEnrichmentsTable.id, input.enrichmentId),
          eq(seedEnrichmentsTable.seedId, input.seedId),
          eq(seedEnrichmentsTable.userId, input.userId),
        ),
      )
      .returning();

    return requireRow(updatedRow, "Seed enrichment was not marked failed.");
  },
  async markReady(input) {
    const [updatedRow] = await db
      .update(seedEnrichmentsTable)
      .set({
        completedAt: now(),
        errorCode: null,
        failedAt: null,
        guardrailFlags: input.guardrailFlags,
        model: input.model,
        payload: input.payload,
        provider: input.provider,
        startedAt: null,
        status: "ready",
        updatedAt: now(),
      })
      .where(
        and(
          eq(seedEnrichmentsTable.id, input.enrichmentId),
          eq(seedEnrichmentsTable.seedId, input.seedId),
          eq(seedEnrichmentsTable.userId, input.userId),
        ),
      )
      .returning();

    return requireRow(updatedRow, "Seed enrichment was not marked ready.");
  },
});

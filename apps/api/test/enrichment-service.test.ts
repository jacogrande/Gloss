import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { SeedEnrichmentPayload } from "@gloss/shared/types";

import type {
  SeedEnrichmentRow,
  SeedEnrichmentTraceRow,
  SeedRow,
} from "../src/db/schema";
import type { Logger } from "../src/lib/logger";
import type { EnrichmentProviders } from "../src/lib/enrichment-providers";
import { createEnrichmentService } from "../src/services/enrichment-service";
import type { SeedEnrichmentRepository } from "../src/repositories/seed-enrichment-repository";
import type { SeedRepository } from "../src/repositories/seed-repository";
import type { RequestRateLimitService } from "../src/services/request-rate-limit-service";
import type { ProductEventService } from "../src/services/product-event-service";

const createLogger = (): Logger => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
});

const createSeedRow = (word: string): SeedRow => ({
  createdAt: new Date("2026-03-26T00:00:00.000Z"),
  id: "seed_1",
  normalizedWord: word.toLowerCase(),
  sourceId: null,
  stage: "new",
  updatedAt: new Date("2026-03-26T00:00:00.000Z"),
  userId: "user_1",
  word,
});

const createPendingRow = (): SeedEnrichmentRow => ({
  completedAt: null,
  createdAt: new Date("2026-03-26T00:00:00.000Z"),
  errorCode: null,
  failedAt: null,
  guardrailFlags: [],
  id: "enrichment_1",
  model: "fixture-model",
  payload: null,
  promptTemplateVersion: "seed-enrichment.v1",
  provider: "fixture",
  requestedAt: new Date("2026-03-26T00:00:00.000Z"),
  schemaVersion: "seed-enrichment-payload.v1",
  seedId: "seed_1",
  startedAt: new Date("2026-03-26T00:00:00.000Z"),
  status: "pending",
  updatedAt: new Date("2026-03-26T00:00:00.000Z"),
  userId: "user_1",
});

const createReadyPayload = (): SeedEnrichmentPayload => ({
  contrastiveWord: {
    note: "Opaque language hides what pellucid language makes clear.",
    word: "opaque",
  },
  gloss:
    "In this sentence, it means the explanation was especially clear and easy to follow.",
  morphologyNote: {
    note: "The dictionary segments the headword to highlight its internal structure.",
  },
  registerNote: "It sounds more formal than everyday clear.",
  relatedWord: {
    note: "Both words praise clarity.",
    word: "lucid",
  },
});

const createReadyRow = (): SeedEnrichmentRow => ({
  ...createPendingRow(),
  completedAt: new Date("2026-03-26T00:00:01.000Z"),
  guardrailFlags: [],
  payload: createReadyPayload(),
  startedAt: null,
  status: "ready",
  updatedAt: new Date("2026-03-26T00:00:01.000Z"),
});

const createRepository = (): SeedRepository => ({
  createSeed: vi.fn(),
  getSeedDetail: vi.fn(() =>
    Promise.resolve({
      contexts: [
        {
          createdAt: new Date("2026-03-26T00:00:00.000Z"),
          id: "context_1",
          isPrimary: true,
          kind: "sentence" as const,
          seedId: "seed_1",
          text: "Her explanation was pellucid even under pressure.",
        },
      ],
    seed: createSeedRow("pellucid"),
      source: {
        author: "A. Reader",
        id: "source_1",
        kind: "book" as const,
        title: "On Style",
        url: null,
      },
    }),
  ),
  listSeeds: vi.fn(),
  updateSeed: vi.fn(),
});

const createProviders = (): EnrichmentProviders => ({
  lexicalEvidenceProvider: {
    getDictionaryEntry: vi.fn(() =>
      Promise.resolve({
        exampleSentences: [
          "Her explanation remained pellucid even as the discussion became technical.",
        ],
        glosses: ["clear and easy to understand"],
        lemma: "pellucid",
        morphologyHints: [
          "Merriam segments the headword as pel·lu·cid, which can help you notice the word's internal structure.",
        ],
        partOfSpeech: "adjective",
        registerLabels: ["formal"],
      }),
    ),
    getRelationCandidates: vi.fn(() =>
      Promise.resolve({
        contrastCandidates: ["opaque"],
        relatedCandidates: ["lucid"],
      }),
    ),
  },
  modelProvider: {
    generate: vi.fn(() => Promise.resolve(createReadyPayload())),
    model: "fixture-model",
    provider: "fixture",
  },
});

const createRateLimitService = (): RequestRateLimitService => ({
  enforce: vi.fn(() =>
    Promise.resolve({
      allowed: true,
      limit: 10,
      remaining: 9,
      requestCount: 1,
      retryAfterSeconds: 0,
      windowEndsAt: new Date("2026-03-26T00:01:00.000Z"),
      windowStartedAt: new Date("2026-03-26T00:00:00.000Z"),
    }),
  ),
});

const createProductEventService = (): ProductEventService => ({
  listEvents: vi.fn(() => Promise.resolve([])),
  listSeedSnapshots: vi.fn(() => Promise.resolve([])),
  record: vi.fn(() => Promise.resolve()),
});

const createPool = (): {
  connect: () => Promise<{
    query: (sql: string) => Promise<{
      rows: Array<{ acquired?: boolean }>;
    }>;
    release: () => void;
  }>;
} => ({
  connect: () =>
    Promise.resolve({
      query: (sql: string) =>
        Promise.resolve({
          rows: sql.includes("pg_try_advisory_lock")
            ? [{ acquired: true }]
            : [],
        }),
    release: (): void => {},
    }),
});

describe("enrichment service", () => {
  it("forces a refresh when requested against an existing ready enrichment", async () => {
    const logger = createLogger();
    const repository = createRepository();
    const providers = createProviders();
    const currentReadyRow = createReadyRow();
    const pendingRow = createPendingRow();
    const seedEnrichmentRepository: SeedEnrichmentRepository = {
      acquirePending: vi.fn(() => Promise.resolve(pendingRow)),
      createTrace: vi.fn(() =>
        Promise.resolve({
          createdAt: new Date("2026-03-26T00:00:01.000Z"),
          errorCode: null,
          guardrailFlags: [],
          id: "trace_1",
          lexicalEvidence: {
            capturedSentencePreview:
              "Her explanation was pellucid even under pressure.",
            contrastCandidates: ["opaque"],
            dictionaryGlosses: ["clear and easy to understand"],
            exampleSentences: [],
            lemma: "pellucid",
            morphologyHints: [],
            partOfSpeech: "adjective",
            registerLabels: [],
            relatedCandidates: ["lucid"],
            sourceSummary: {
              kind: "book",
              title: "On Style",
            },
          },
          model: "fixture-model",
          outputRedacted: createReadyPayload(),
          promptTemplateVersion: "seed-enrichment.v1",
          provider: "fixture",
          schemaVersion: "seed-enrichment-payload.v1",
          seedEnrichmentId: pendingRow.id,
          seedId: "seed_1",
          status: "ready" as const,
          userId: "user_1",
          validationResult: {
            accepted: true,
            issues: [],
          },
        } satisfies SeedEnrichmentTraceRow),
      ),
      getCurrentForSeed: vi
        .fn()
        .mockResolvedValueOnce(currentReadyRow)
        .mockResolvedValueOnce(currentReadyRow),
      getLatestTraceForSeed: vi.fn(() => Promise.resolve(null)),
      markFailed: vi.fn(),
      markReady: vi.fn(() => Promise.resolve(createReadyRow())),
    };
    const service = createEnrichmentService({
      db: {} as never,
      logger,
      pool: createPool() as never,
      providers,
      productEventService: createProductEventService(),
      requestRateLimitService: createRateLimitService(),
      repository,
      seedEnrichmentRepository,
    });

    const enrichment = await service.requestSeedEnrichment({
      force: true,
      requestId: "request_2",
      seedId: "seed_1",
      userId: "user_1",
    });

    expect(enrichment.status).toBe("ready");
    expect(seedEnrichmentRepository.acquirePending).toHaveBeenCalledTimes(1);
    expect(providers.modelProvider.generate).toHaveBeenCalledTimes(1);
  });

  it("preserves a ready enrichment when trace persistence fails", async () => {
    const logger = createLogger();
    const repository = createRepository();
    const providers = createProviders();
    const markFailed = vi.fn(() =>
      Promise.reject(new Error("markFailed should not be called for ready rows.")),
    );
    const seedEnrichmentRepository: SeedEnrichmentRepository = {
      acquirePending: vi.fn(() => Promise.resolve(createPendingRow())),
      createTrace: vi.fn(() =>
        Promise.reject(new Error("Trace persistence unavailable.")),
      ),
      getCurrentForSeed: vi.fn(() => Promise.resolve(null)),
      getLatestTraceForSeed: vi.fn(() => Promise.resolve(null)),
      markFailed,
      markReady: vi.fn(() => Promise.resolve(createReadyRow())),
    };
    const service = createEnrichmentService({
      db: {} as never,
      logger,
      pool: createPool() as never,
      providers,
      productEventService: createProductEventService(),
      requestRateLimitService: createRateLimitService(),
      repository,
      seedEnrichmentRepository,
    });

    const enrichment = await service.requestSeedEnrichment({
      requestId: "request_1",
      seedId: "seed_1",
      userId: "user_1",
    });

    expect(enrichment.status).toBe("ready");
    expect(enrichment.payload?.relatedWord?.word).toBe("lucid");
    expect(markFailed).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      "enrichment.trace_persist_failed",
      expect.objectContaining({
        requestId: "request_1",
        seedId: "seed_1",
        status: "ready",
      }),
    );
  });
});

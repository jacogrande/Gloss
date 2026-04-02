import {
  describe,
  expect,
  it,
} from "vitest";

import type { SeedDetail } from "@gloss/shared/types";
import type { SeedEnrichment } from "@gloss/shared/types";

import { mergeSeedDetailState } from "../src/features/seeds/seed-detail-state";

const createSeed = (
  enrichment: SeedDetail["enrichment"],
): SeedDetail => ({
  contexts: [],
  createdAt: "2026-03-26T00:00:00.000Z",
  enrichment,
  id: "seed_1",
  primarySentence: "Her explanation was pellucid even under pressure.",
  source: null,
  stage: "new",
  updatedAt: "2026-03-26T00:00:00.000Z",
  word: "pellucid",
});

const createEnrichment = (
  overrides: Partial<SeedEnrichment> & Pick<SeedEnrichment, "status">,
): SeedEnrichment => ({
  completedAt: null,
  createdAt: "2026-03-26T00:00:00.000Z",
  errorCode: null,
  failedAt: null,
  guardrailFlags: [],
  id: "enrichment_1",
  lexicalPreview: {
    definition: "clear and easy to understand",
    partOfSpeech: "adjective",
    source: "merriam-webster",
  },
  model: "fixture-model",
  payload: null,
  promptTemplateVersion: "seed-enrichment.v1",
  provider: "fixture",
  requestedAt: "2026-03-26T00:00:00.000Z",
  schemaVersion: "seed-enrichment-payload.v1",
  startedAt: null,
  updatedAt: "2026-03-26T00:00:00.000Z",
  ...overrides,
});

describe("mergeSeedDetailState", () => {
  it("keeps a newer local ready enrichment over an older pending fetch", () => {
    const current = createSeed(createEnrichment({
      completedAt: "2026-03-26T00:00:06.000Z",
      payload: {
        gloss: "Especially clear and easy to follow.",
      },
      requestedAt: "2026-03-26T00:00:05.000Z",
      startedAt: "2026-03-26T00:00:05.000Z",
      status: "ready",
      updatedAt: "2026-03-26T00:00:06.000Z",
    }));
    const incoming = createSeed(createEnrichment({
      payload: null,
      requestedAt: "2026-03-26T00:00:03.000Z",
      startedAt: "2026-03-26T00:00:03.000Z",
      status: "pending",
      updatedAt: "2026-03-26T00:00:03.000Z",
    }));

    expect(mergeSeedDetailState(current, incoming).enrichment?.status).toBe("ready");
  });

  it("accepts a newer incoming enrichment over an older local pending state", () => {
    const current = createSeed(createEnrichment({
      payload: null,
      requestedAt: "2026-03-26T00:00:03.000Z",
      startedAt: "2026-03-26T00:00:03.000Z",
      status: "pending",
      updatedAt: "2026-03-26T00:00:03.000Z",
    }));
    const incoming = createSeed(createEnrichment({
      completedAt: "2026-03-26T00:00:08.000Z",
      payload: {
        gloss: "Especially clear and easy to follow.",
      },
      requestedAt: "2026-03-26T00:00:07.000Z",
      startedAt: "2026-03-26T00:00:07.000Z",
      status: "ready",
      updatedAt: "2026-03-26T00:00:08.000Z",
    }));

    expect(mergeSeedDetailState(current, incoming).enrichment?.status).toBe("ready");
  });

  it("keeps newer local evidence over an older incoming seed snapshot", () => {
    const current = createSeed(null);
    current.updatedAt = "2026-03-26T00:00:03.000Z";
    current.primarySentence = "A newer local sentence.";
    current.contexts = [
      {
        createdAt: "2026-03-26T00:00:03.000Z",
        id: "context_2",
        isPrimary: true,
        kind: "sentence",
        text: "A newer local sentence.",
      },
    ];

    const incoming = createSeed(null);
    incoming.updatedAt = "2026-03-26T00:00:01.000Z";
    incoming.primarySentence = "An older server sentence.";
    incoming.contexts = [
      {
        createdAt: "2026-03-26T00:00:01.000Z",
        id: "context_1",
        isPrimary: true,
        kind: "sentence",
        text: "An older server sentence.",
      },
    ];

    expect(mergeSeedDetailState(current, incoming).primarySentence).toBe(
      "A newer local sentence.",
    );
    expect(mergeSeedDetailState(current, incoming).contexts[0]?.text).toBe(
      "A newer local sentence.",
    );
  });

  it("accepts an explicit newer server removal of evidence", () => {
    const current = createSeed(null);
    current.updatedAt = "2026-03-26T00:00:01.000Z";
    current.contexts = [
      {
        createdAt: "2026-03-26T00:00:01.000Z",
        id: "context_1",
        isPrimary: true,
        kind: "sentence",
        text: "An older server sentence.",
      },
    ];
    current.source = {
      author: "A. Reader",
      id: "source_1",
      kind: "book",
      title: "On Style",
      url: null,
    };

    const incoming = createSeed(null);
    incoming.updatedAt = "2026-03-26T00:00:03.000Z";
    incoming.primarySentence = null;
    incoming.contexts = [];
    incoming.source = null;

    const merged = mergeSeedDetailState(current, incoming);

    expect(merged.primarySentence).toBeNull();
    expect(merged.contexts).toEqual([]);
    expect(merged.source).toBeNull();
  });
});

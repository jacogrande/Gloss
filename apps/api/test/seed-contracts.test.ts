import { describe, expect, it } from "vitest";

import {
  normalizeCaptureInput,
  normalizeWord,
  toSeedDetail,
  toSeedSummary,
} from "../src/lib/seed-contracts";

describe("seed contracts helpers", () => {
  it("normalizes words for storage and filtering", () => {
    expect(normalizeWord("  Lapidary   ")).toBe("lapidary");
    expect(normalizeWord("High  Style")).toBe("high style");
  });

  it("normalizes capture input without mutating semantics", () => {
    const normalized = normalizeCaptureInput({
      sentence: "  Dense   and exact. ",
      source: {
        author: "  A. Reader ",
        kind: "book",
        title: "  Collected Essays ",
      },
      word: "  lapidary ",
    });

    expect(normalized).toEqual({
      sentence: "Dense and exact.",
      source: {
        author: "A. Reader",
        kind: "book",
        title: "Collected Essays",
        url: undefined,
      },
      word: "lapidary",
    });
  });

  it("maps repository records to a seed summary", () => {
    const summary = toSeedSummary({
      primaryContext: {
        createdAt: new Date("2026-03-26T12:34:56.000Z"),
        id: "context_123",
        isPrimary: true,
        kind: "sentence",
        seedId: "seed_123",
        text: "The prose became unexpectedly lapidary by the final chapter.",
      },
      seed: {
        createdAt: new Date("2026-03-26T12:34:56.000Z"),
        id: "seed_123",
        normalizedWord: "lapidary",
        sourceId: "source_123",
        stage: "new",
        updatedAt: new Date("2026-03-26T12:34:56.000Z"),
        userId: "user_123",
        word: "lapidary",
      },
      source: {
        author: "A. Reader",
        id: "source_123",
        kind: "book",
        title: "Collected Essays",
        url: null,
      },
    });

    expect(summary.word).toBe("lapidary");
    expect(summary.source?.kind).toBe("book");
  });

  it("maps repository records to a seed detail with ordered contexts", () => {
    const detail = toSeedDetail({
      contexts: [
        {
          createdAt: new Date("2026-03-26T12:34:56.000Z"),
          id: "context_123",
          isPrimary: true,
          kind: "sentence",
          seedId: "seed_123",
          text: "The prose became unexpectedly lapidary by the final chapter.",
        },
      ],
      seed: {
        createdAt: new Date("2026-03-26T12:34:56.000Z"),
        id: "seed_123",
        normalizedWord: "lapidary",
        sourceId: null,
        stage: "new",
        updatedAt: new Date("2026-03-26T12:34:56.000Z"),
        userId: "user_123",
        word: "lapidary",
      },
      source: null,
    });

    expect(detail.primarySentence).toBe(
      "The prose became unexpectedly lapidary by the final chapter.",
    );
    expect(detail.contexts).toHaveLength(1);
  });
});

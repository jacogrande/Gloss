import {
  describe,
  expect,
  it,
} from "vitest";

import type { SeedEnrichment } from "@gloss/shared/types";

import {
  formatSourceEvidence,
  getSeedActionState,
  getSeedLoadNotice,
  getSeedRecoveryState,
} from "../src/features/seeds/seed-presenters";
import {
  shouldShowContextualGloss,
  toDictionaryDefinition,
} from "../src/lib/contextual-gloss";

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
  updatedAt: "2026-03-26T00:00:02.000Z",
  ...overrides,
});

describe("seed presenters", () => {
  it("strips common contextual lead-ins from dictionary definitions", () => {
    expect(
      toDictionaryDefinition(
        "In this kind of context, it describes language that is especially clear.",
      ),
    ).toBe("Language that is especially clear.");
    expect(
      shouldShowContextualGloss(
        "Language that is especially clear.",
        "In this kind of context, it describes language that is especially clear.",
      ),
    ).toBe(true);
  });

  it("formats source evidence into one calm line", () => {
    expect(
      formatSourceEvidence({
        author: "A. Reader",
        kind: "book",
        title: "On Style",
      }),
    ).toBe("On Style · A. Reader · Book");
  });

  it("derives recovery and next-action states from the seed", () => {
    const recoveryState = getSeedRecoveryState({
      seed: {
        enrichment: null,
        primarySentence: null,
        source: null,
      },
    });

    expect(recoveryState?.title).toBe("Give this word more context");
    expect(recoveryState?.actionLabel).toBe("Save context");
    expect(recoveryState?.sentenceLabel).toBe("Sentence from your reading (recommended)");
    expect(recoveryState?.sentencePlaceholder).toBe(
      "Paste the sentence where you saw this word.",
    );
    expect(recoveryState?.message).toBe(
      "Add the sentence where you found this word, or add source details. That gives Gloss the strongest footing for the final meaning and review cards.",
    );
    expect(
      getSeedActionState({
        seed: {
          enrichment: createEnrichment({
            completedAt: "2026-03-26T00:00:02.000Z",
            payload: {
              gloss: "Especially clear and easy to follow.",
            },
            startedAt: null,
            status: "ready",
          }),
        },
      }),
    ).toEqual({
      primary: {
        href: "/review",
        label: "Review queue",
      },
      secondary: {
        href: "/capture",
        label: "Save another word",
      },
    });
  });

  it("softens the weak-evidence recovery copy without promising a successful rebuild", () => {
    const recoveryState = getSeedRecoveryState({
      seed: {
        enrichment: createEnrichment({
          errorCode: "ENRICHMENT_EVIDENCE_UNAVAILABLE",
          failedAt: "2026-03-26T00:00:02.000Z",
          id: "enrichment_weak",
          lexicalPreview: null,
          payload: null,
          startedAt: null,
          status: "failed",
        }),
        primarySentence: null,
        source: null,
      },
    });

    expect(recoveryState?.title).toBe("Help Gloss finish this word");
    expect(recoveryState?.actionLabel).toBe("Save context and try again");
    expect(recoveryState?.sentenceLabel).toBe("Sentence from your reading (recommended)");
    expect(recoveryState?.message).toBe(
      "Gloss found the dictionary entry, but it could not safely adapt the meaning to your reading yet. Add the sentence where you saw this word, or add source details.",
    );
  });

  it("asks for one more clue when weak evidence remains after a sentence is saved", () => {
    const recoveryState = getSeedRecoveryState({
      seed: {
        enrichment: createEnrichment({
          errorCode: "ENRICHMENT_EVIDENCE_UNAVAILABLE",
          failedAt: "2026-03-26T00:00:02.000Z",
          id: "enrichment_weak_sentence",
          lexicalPreview: {
            definition: "measured or restrained in tone",
            partOfSpeech: "adjective",
            source: "merriam-webster",
          },
          payload: null,
          startedAt: null,
          status: "failed",
        }),
        primarySentence: "The sentence makes it sound measured and restrained.",
        source: null,
      },
    });

    expect(recoveryState?.title).toBe("Give Gloss one more clue");
    expect(recoveryState?.actionLabel).toBe("Save details and try again");
    expect(recoveryState?.sentenceLabel).toBe("Sentence from your reading");
    expect(recoveryState?.sentencePlaceholder).toBe(
      "Tighten the sentence where you saw this word.",
    );
    expect(recoveryState?.message).toBe(
      "Gloss has the sentence, but it still needs one more clue to pin down the meaning safely. Add source details or tighten the sentence, then try again.",
    );
  });

  it("derives a calm load notice when the authoritative seed fetch fails", () => {
    expect(getSeedLoadNotice("Unable to load this seed.")).toEqual({
      message:
        "Unable to load this seed. Showing the last saved version for now.",
      title: "Couldn’t refresh",
    });
  });
});

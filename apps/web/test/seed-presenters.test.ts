import {
  describe,
  expect,
  it,
} from "vitest";

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
    expect(recoveryState?.sentenceLabel).toBe("Sentence from your reading");
    expect(recoveryState?.sentencePlaceholder).toBe(
      "Paste the sentence where you saw this word.",
    );
    expect(recoveryState?.message).toBe(
      "Paste the sentence where you found this word, or add source details. Gloss uses that context to build the definition and review cards.",
    );
    expect(
      getSeedActionState({
        seed: {
          enrichment: {
            completedAt: "2026-03-26T00:00:02.000Z",
            createdAt: "2026-03-26T00:00:00.000Z",
            errorCode: null,
            failedAt: null,
            guardrailFlags: [],
            id: "enrichment_1",
            model: "fixture-model",
            payload: {
              gloss: "Especially clear and easy to follow.",
            },
            promptTemplateVersion: "seed-enrichment.v1",
            provider: "fixture",
            requestedAt: "2026-03-26T00:00:00.000Z",
            schemaVersion: "seed-enrichment-payload.v1",
            startedAt: null,
            status: "ready",
            updatedAt: "2026-03-26T00:00:02.000Z",
          },
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
        enrichment: {
          completedAt: null,
          createdAt: "2026-03-26T00:00:00.000Z",
          errorCode: "ENRICHMENT_EVIDENCE_UNAVAILABLE",
          failedAt: "2026-03-26T00:00:02.000Z",
          guardrailFlags: [],
          id: "enrichment_weak",
          model: "fixture-model",
          payload: null,
          promptTemplateVersion: "seed-enrichment.v1",
          provider: "fixture",
          requestedAt: "2026-03-26T00:00:00.000Z",
          schemaVersion: "seed-enrichment-payload.v1",
          startedAt: null,
          status: "failed",
          updatedAt: "2026-03-26T00:00:02.000Z",
        },
        primarySentence: null,
        source: null,
      },
    });

    expect(recoveryState?.title).toBe("Give this word more context");
    expect(recoveryState?.sentenceLabel).toBe("Sentence from your reading");
    expect(recoveryState?.message).toBe(
      "Paste the sentence where you found this word, or add source details. Gloss needs that context to try again.",
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

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  formatSourceEvidence,
  getSeedActionState,
  getSeedRecoveryState,
  shouldShowContextualGloss,
  toDictionaryDefinition,
} from "../src/features/seeds/seed-presenters";

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

    expect(recoveryState?.title).toBe("Add context");
    expect(
      getSeedActionState({
        recoveryState,
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
    ).toBeNull();

    expect(
      getSeedActionState({
        recoveryState: null,
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
        label: "Start review",
      },
      secondary: {
        href: "/capture",
        label: "Save another word",
      },
    });
  });
});

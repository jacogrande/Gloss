import {
  describe,
  expect,
  it,
} from "vitest";

import type { SeedDetail } from "@gloss/shared/types";

import type { ReviewStateRow } from "../src/db/schema";
import {
  applyReviewOutcomeToState,
  buildContrastiveChoiceCardDraft,
  selectDueReviewTargets,
} from "../src/lib/review-contracts";

const createSeed = (input?: {
  contrastiveWord?: string;
  primarySentence?: string;
  registerNote?: string;
  word?: string;
}): SeedDetail => ({
  contexts: [
    {
      createdAt: "2026-03-29T00:00:00.000Z",
      id: "context_1",
      isPrimary: true,
      kind: "sentence",
      text:
        input?.primarySentence ?? "Her explanation was pellucid even under pressure.",
    },
  ],
  createdAt: "2026-03-29T00:00:00.000Z",
  enrichment: {
    completedAt: "2026-03-29T00:00:05.000Z",
    createdAt: "2026-03-29T00:00:00.000Z",
    errorCode: null,
    failedAt: null,
    guardrailFlags: [],
    id: "enrichment_1",
    model: "fixture-seed-enrichment-v1",
    payload: {
      ...(input?.contrastiveWord
        ? {
            contrastiveWord: {
              note: "A nearby contrasting word.",
              word: input.contrastiveWord,
            },
          }
        : {}),
      gloss: "Especially clear and easy to follow.",
      ...(input?.registerNote
        ? {
            registerNote: input.registerNote,
          }
        : {}),
    },
    promptTemplateVersion: "seed-enrichment.v1",
    provider: "fixture",
    requestedAt: "2026-03-29T00:00:00.000Z",
    schemaVersion: "seed-enrichment-payload.v1",
    startedAt: null,
    status: "ready",
    updatedAt: "2026-03-29T00:00:05.000Z",
  },
  id: "seed_1",
  primarySentence:
    input?.primarySentence ?? "Her explanation was pellucid even under pressure.",
  source: null,
  stage: "new",
  updatedAt: "2026-03-29T00:00:05.000Z",
  word: input?.word ?? "pellucid",
});

const createReviewState = (input: {
  distinctionDueAt: Date;
  distinctionScore?: number;
  recognitionDueAt: Date;
  recognitionScore?: number;
  usageDueAt: Date;
  usageScore?: number;
}): ReviewStateRow => ({
  createdAt: new Date("2026-03-29T00:00:00.000Z"),
  distinctionDueAt: input.distinctionDueAt,
  distinctionScore: input.distinctionScore ?? 0,
  id: "state_1",
  lastReviewedAt: new Date("2026-03-29T00:00:00.000Z"),
  lastSessionId: "session_1",
  recognitionDueAt: input.recognitionDueAt,
  recognitionScore: input.recognitionScore ?? 0,
  schedulerVersion: "review-scheduler.v1",
  seedId: "seed_1",
  updatedAt: new Date("2026-03-29T00:00:00.000Z"),
  usageDueAt: input.usageDueAt,
  usageScore: input.usageScore ?? 0,
  userId: "user_1",
});

describe("review contracts", () => {
  it("does not surface future-due review targets", () => {
    const now = new Date("2026-03-29T12:00:00.000Z");
    const targets = selectDueReviewTargets({
      candidates: [
        {
          reviewState: createReviewState({
            distinctionDueAt: new Date("2026-03-30T12:00:00.000Z"),
            recognitionDueAt: new Date("2026-03-30T12:00:00.000Z"),
            usageDueAt: new Date("2026-03-30T12:00:00.000Z"),
          }),
          seed: createSeed({
            contrastiveWord: "opaque",
            registerNote: "Mostly formal.",
          }),
        },
      ],
      limit: 3,
      now,
    });

    expect(targets).toEqual([]);
  });

  it("does not pretend unsupported distinction or usage work is reviewable", () => {
    const now = new Date("2026-03-29T12:00:00.000Z");
    const targets = selectDueReviewTargets({
      candidates: [
        {
          reviewState: createReviewState({
            distinctionDueAt: new Date("2026-03-28T12:00:00.000Z"),
            recognitionDueAt: new Date("2026-03-30T12:00:00.000Z"),
            usageDueAt: new Date("2026-03-30T12:00:00.000Z"),
          }),
          seed: createSeed(),
        },
      ],
      limit: 3,
      now,
    });

    expect(targets).toEqual([]);
  });

  it("escapes special characters when building contrastive cards", () => {
    const draft = buildContrastiveChoiceCardDraft(
      createSeed({
        contrastiveWord: "Java",
        primarySentence: "C++ belongs in the blank.",
        word: "C++",
      }),
    );

    expect(draft.promptPayload.type).toBe("contrastive_choice");
    if (draft.promptPayload.type !== "contrastive_choice") {
      throw new Error("Expected a contrastive-choice review card.");
    }

    expect(draft.promptPayload.sentence).toContain("____");
  });

  it("uses the provided state id when creating a first review state", () => {
    const applied = applyReviewOutcomeToState({
      answerKey: {
        correctChoiceId: "choice_1",
      },
      currentState: null,
      dimension: "recognition",
      now: new Date("2026-03-29T12:00:00.000Z"),
      seedId: "seed_1",
      sessionId: "session_1",
      stateId: "state_from_service",
      submission: {
        choiceId: "choice_1",
      },
    });

    expect(applied.nextState.id).toBe("state_from_service");
  });
});

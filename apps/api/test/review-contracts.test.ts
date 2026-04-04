import {
  describe,
  expect,
  it,
} from "vitest";

import type { SeedDetail } from "@gloss/shared/types";

import type { ReviewStateRow } from "../src/db/schema";
import {
  applyReviewOutcomeToState,
  buildDeterministicClozeRecallCardDraft,
  buildContrastiveChoiceCardDraft,
  gradeReviewSubmission,
  isSentenceVerbatimReuse,
  selectDueReviewTargets,
  validateClozePrompt,
  validateRecognitionPrompt,
} from "../src/lib/review-contracts";

const createSeed = (input?: {
  contrastiveWord?: string;
  gloss?: string;
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
    lexicalPreview: {
      definition: "clear and easy to understand",
      partOfSpeech: "adjective",
      source: "merriam-webster",
    },
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
      gloss: input?.gloss ?? "Especially clear and easy to follow.",
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

  it("builds cloze recall cards without leaking the answer in the prompt", () => {
    const draft = buildDeterministicClozeRecallCardDraft(createSeed());

    expect(draft.promptPayload.type).toBe("cloze_recall");
    expect(draft.promptPayload.question).toContain("Type the saved word");
    expect(draft.promptPayload.sentence).toContain("____");
    expect(draft.promptPayload.sentence).not.toContain("pellucid");
    expect(draft.promptPayload.sentence).not.toBe(
      "Her explanation was ____ even under pressure.",
    );
  });

  it("does not leak the answer even when the gloss contains the word", () => {
    const draft = buildDeterministicClozeRecallCardDraft(
      createSeed({
        gloss: "Pellucid means especially clear and easy to follow.",
      }),
    );

    expect(draft.promptPayload.question).toBe(
      "Type the saved word that best completes the blank.",
    );
    expect(draft.promptPayload.question.toLowerCase()).not.toContain("pellucid");
  });

  it("rejects cloze prompts that leak the answer", () => {
    expect(() =>
      validateClozePrompt({
        promptPayload: {
          question: "Type pellucid to complete the blank.",
          sentence: "Her explanation was ____ even under pressure.",
          type: "cloze_recall",
        },
        word: "pellucid",
      }),
    ).toThrow(/must not leak the answer/i);
  });

  it("does not treat substrings as cloze answer leaks", () => {
    expect(() =>
      validateClozePrompt({
        promptPayload: {
          question: "Type the saved word that best completes the blank.",
          sentence: "The opaquely written memo stayed ____ under scrutiny.",
          type: "cloze_recall",
        },
        word: "opaque",
      }),
    ).not.toThrow();
  });

  it("rejects cloze prompts that simply blank the captured sentence", () => {
    expect(() =>
      validateClozePrompt({
        capturedSentence: "Her explanation was pellucid even under pressure.",
        promptPayload: {
          question: "Type the saved word that best completes the blank.",
          sentence: "Her explanation was ____ even under pressure.",
          type: "cloze_recall",
        },
        word: "pellucid",
      }),
    ).toThrow(/must not repeat the captured sentence/i);
  });

  it("rejects recognition prompts that repeat the captured sentence", () => {
    expect(() =>
      validateRecognitionPrompt({
        capturedSentence: "Her explanation was pellucid even under pressure.",
        promptPayload: {
          choices: [
            {
              id: "choice_1",
              label: "Especially clear and easy to follow.",
            },
            {
              id: "choice_2",
              label: "Difficult to understand.",
            },
          ],
          question: "What does pellucid suggest in this new sentence?",
          sentence: "Her explanation was pellucid even under pressure.",
          type: "recognition_in_fresh_sentence",
          word: "pellucid",
        },
      }),
    ).toThrow(/must not repeat the captured sentence/i);
  });

  it("promotes mature recognition targets into cloze recall when a sentence exists", () => {
    const now = new Date("2026-03-29T12:00:00.000Z");
    const targets = selectDueReviewTargets({
      candidates: [
        {
          reviewState: createReviewState({
            distinctionDueAt: new Date("2026-03-30T12:00:00.000Z"),
            distinctionScore: 1,
            recognitionDueAt: new Date("2026-03-28T12:00:00.000Z"),
            recognitionScore: 2,
            usageDueAt: new Date("2026-03-30T12:00:00.000Z"),
            usageScore: 1,
          }),
          seed: createSeed(),
        },
      ],
      limit: 3,
      now,
    });

    expect(targets).toHaveLength(1);
    expect(targets[0]?.dimension).toBe("recognition");
    expect(targets[0]?.exerciseType).toBe("cloze_recall");
  });

  it("grades text recall answers leniently around casing and spacing", () => {
    expect(
      gradeReviewSubmission({
        answerKey: {
          acceptableAnswers: ["pellucid"],
          canonicalAnswer: "pellucid",
          type: "text",
        },
        submission: {
          text: "  PELLUCID  ",
          type: "text",
        },
      }),
    ).toEqual({
      correct: true,
      outcome: "correct",
    });
  });

  it("uses the provided state id when creating a first review state", () => {
    const applied = applyReviewOutcomeToState({
      answerKey: {
        correctChoiceId: "choice_1",
        type: "choice",
      },
      currentState: null,
      dimension: "recognition",
      now: new Date("2026-03-29T12:00:00.000Z"),
      seedId: "seed_1",
      sessionId: "session_1",
      stateId: "state_from_service",
      submission: {
        choiceId: "choice_1",
        type: "choice",
      },
    });

    expect(applied.nextState.id).toBe("state_from_service");
  });

  it("detects verbatim sentence reuse after normalization", () => {
    expect(
      isSentenceVerbatimReuse({
        candidateSentence: "  Her explanation was pellucid even under pressure. ",
        capturedSentence: "Her explanation was pellucid even under pressure.",
      }),
    ).toBe(true);
  });
});

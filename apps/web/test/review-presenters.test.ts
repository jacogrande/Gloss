import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ReviewCard,
  ReviewSessionDetail,
} from "@gloss/shared/types";

import {
  formatReviewExerciseLabel,
  getReviewFeedbackDisplayState,
  getReviewQueueDisplayState,
  getReviewRouteState,
} from "../src/features/review/review-presenters";

const createCard = (): ReviewCard => ({
  dimension: "recognition",
  exerciseType: "meaning_in_context",
  generationSource: "template",
  id: "card_1",
  position: 0,
  promptPayload: {
    choices: [
      {
        id: "choice_1",
        label: "Especially clear and easy to follow.",
      },
      {
        id: "choice_2",
        label: "Mostly careless and imprecise.",
      },
      {
        id: "choice_3",
        label: "Mainly casual or unserious.",
      },
    ],
    question: "What does pellucid mean here?",
    sentence: "Her explanation was pellucid even under pressure.",
    type: "meaning_in_context",
    word: "pellucid",
  },
  status: "pending",
});

const createSession = (): ReviewSessionDetail => ({
  cards: [createCard()],
  session: {
    cardCount: 1,
    completedAt: null,
    currentCardId: "card_1",
    id: "session_1",
    remainingCount: 1,
    startedAt: "2026-03-29T00:00:00.000Z",
    status: "active",
  },
});

describe("review presenters", () => {
  it("describes due words without implying a direct card count", () => {
    expect(
      getReviewQueueDisplayState({
        activeSessionId: null,
        availableCount: 1,
        capturedCount: 2,
        dueByDimension: {
          distinction: 1,
          recognition: 1,
          usage: 0,
        },
        dueCount: 2,
      }).summary,
    ).toBe("2 words due now");
  });

  it("builds learner-facing feedback from a submitted card", () => {
    const feedback = getReviewFeedbackDisplayState({
      card: createCard(),
      result: {
        cardId: "card_1",
        correct: false,
        correctChoiceId: "choice_1",
        outcome: "incorrect",
        seedStage: "new",
      },
      selectedChoiceId: "choice_2",
    });

    expect(feedback.title).toBe("Not quite");
    expect(feedback.correctChoiceLabel).toBe(
      "Especially clear and easy to follow.",
    );
    expect(feedback.selectedChoiceLabel).toBe(
      "Mostly careless and imprecise.",
    );
    expect(feedback.explanation).toContain("pellucid means especially clear");
  });

  it("models route state explicitly", () => {
    expect(
      getReviewRouteState({
        feedback: null,
        isInitialLoading: true,
        session: null,
      }).kind,
    ).toBe("loading");

    expect(
      getReviewRouteState({
        feedback: null,
        isInitialLoading: false,
        session: createSession(),
      }).kind,
    ).toBe("card");
  });

  it("translates internal exercise types into learner-facing labels", () => {
    expect(formatReviewExerciseLabel("register_judgment")).toBe("Tone");
  });
});

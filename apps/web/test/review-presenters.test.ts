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
  seedId: "seed_1",
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
    const display = getReviewQueueDisplayState({
      activeSessionId: null,
      availableCount: 1,
      capturedCount: 2,
      dueByDimension: {
        distinction: 1,
        recognition: 1,
        usage: 0,
      },
      dueCount: 2,
    });

    expect(display.summary).toBe("2 words ready now");
    expect(display.actionLabel).toBe("Start a short session");
    expect(display.facts).toEqual([
      {
        label: "Ready now",
        value: "2 words",
      },
      {
        label: "You’ll practice",
        value: "Compare, Meaning",
      },
      {
        label: "Session",
        value: "2 cards · About 1 minute",
      },
    ]);
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
        submissionType: "choice",
      },
      submission: {
        choiceId: "choice_2",
        type: "choice",
      },
    });

    expect(feedback.title).toBe("Not quite yet");
    expect(feedback.correctAnswerLabel).toBe(
      "Especially clear and easy to follow.",
    );
    expect(feedback.submittedAnswerLabel).toBe(
      "Mostly careless and imprecise.",
    );
    expect(feedback.explanation).toContain("pellucid means");
    expect(feedback.explanation).toContain("“Especially clear and easy to follow”");
    expect(feedback.message).toContain("Here, the better fit is");
  });

  it("builds learner-facing feedback for typed recall cards", () => {
    const card: ReviewCard = {
      ...createCard(),
      exerciseType: "cloze_recall",
      promptPayload: {
        question:
          "Type the saved word that best completes the blank. Especially clear and easy to follow.",
        sentence: "Her explanation was ____ even under pressure.",
        type: "cloze_recall",
      },
    };
    const feedback = getReviewFeedbackDisplayState({
      card,
      result: {
        cardId: "card_1",
        correct: false,
        expectedText: "pellucid",
        outcome: "incorrect",
        seedStage: "new",
        submissionType: "text",
      },
      submission: {
        text: "lucid",
        type: "text",
      },
    });

    expect(feedback.correctAnswerLabel).toBe("pellucid");
    expect(feedback.submittedAnswerLabel).toBe("lucid");
    expect(feedback.explanation).toContain("missing word is");
    expect(feedback.message).toContain("Not quite");
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
    expect(formatReviewExerciseLabel("cloze_recall")).toBe("Recall");
  });
});

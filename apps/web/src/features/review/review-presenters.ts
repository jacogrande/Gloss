import type {
  ReviewCard,
  ReviewQueueSummary,
  ReviewSessionDetail,
  ReviewSubmissionInput,
  ReviewSubmissionResult,
} from "@gloss/shared/types";

import { toDictionaryDefinition } from "../../lib/contextual-gloss";

type ChoicePromptPayload = Extract<
  ReviewCard["promptPayload"],
  {
    type:
      | "contrastive_choice"
      | "meaning_in_context"
      | "recognition_in_fresh_sentence"
      | "register_judgment";
  }
>;

type ReviewChoice = ChoicePromptPayload["choices"][number];

type ReviewActionLink = {
  href: string;
  label: string;
};

export type ReviewQueueDisplayState = {
  actionLabel: string | null;
  canStart: boolean;
  facts: Array<{
    label: string;
    value: string;
  }>;
  message: string;
  path: string[];
  secondaryAction: ReviewActionLink | null;
  summary: string;
};

export type ReviewFeedbackSnapshot = {
  card: ReviewCard;
  result: ReviewSubmissionResult;
  submission: ReviewSubmissionInput;
};

export type ReviewFeedbackDisplayState = {
  correctAnswerLabel: string;
  explanation: string;
  message: string;
  submittedAnswerLabel: string | null;
  status: "correct" | "incorrect";
  title: string;
};

export type ReviewCompletionDisplayState = {
  actionLabel: string;
  message: string;
  summary: string;
  secondaryAction: ReviewActionLink;
  title: string;
};

export type ReviewRouteState =
  | {
      kind: "loading";
    }
  | {
      kind: "queue";
    }
  | {
      card: ReviewCard;
      kind: "card";
      session: ReviewSessionDetail;
    }
  | {
      feedback: ReviewFeedbackSnapshot;
      kind: "feedback";
      session: ReviewSessionDetail;
    }
  | {
      kind: "complete";
      session: ReviewSessionDetail;
    };

const pluralize = (
  count: number,
  singular: string,
  plural = `${singular}s`,
): string => `${count} ${count === 1 ? singular : plural}`;

const getCurrentCard = (
  session: ReviewSessionDetail | null,
): ReviewCard | null =>
  session?.cards.find((card) => card.status === "pending") ?? null;

const getChoiceById = (
  card: ReviewCard,
  choiceId: string,
): ReviewChoice | null =>
  "choices" in card.promptPayload
    ? card.promptPayload.choices.find((choice) => choice.id === choiceId) ?? null
    : null;

const getChoiceDisplayLabel = (choice: ReviewChoice | null): string =>
  choice?.detail ?? choice?.label ?? "Unavailable";

const formatReviewDimensionLabel = (
  dimension: "distinction" | "recognition" | "usage",
): string => {
  switch (dimension) {
    case "recognition":
      return "Meaning";
    case "distinction":
      return "Compare";
    case "usage":
      return "Use";
    default:
      return "Review";
  }
};

const trimTerminalPunctuation = (value: string): string =>
  value.trim().replace(/[.!?]+$/u, "");

const toSentenceCase = (value: string): string =>
  value.length === 0 ? value : `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;

const toQuotedText = (value: string): string => `“${trimTerminalPunctuation(value)}”`;

const formatDueDimensions = (
  dueByDimension: ReviewQueueSummary["dueByDimension"],
): string => {
  const labels = (
    Object.entries(dueByDimension) as Array<
      [keyof ReviewQueueSummary["dueByDimension"], number]
    >
  )
    .filter(([, count]) => count > 0)
    .map(([dimension]) => formatReviewDimensionLabel(dimension));

  return labels.length > 0 ? labels.join(", ") : "Meaning";
};

const getApproximateReviewCardCount = (
  dueByDimension: ReviewQueueSummary["dueByDimension"],
  dueCount: number,
): number => {
  const dimensionCount = dueByDimension.recognition +
    dueByDimension.distinction +
    dueByDimension.usage;

  return Math.max(dueCount, Math.min(dimensionCount, dueCount * 2));
};

const formatReviewSessionEstimate = (cardCount: number): string => {
  if (cardCount <= 1) {
    return "Under a minute";
  }

  if (cardCount <= 3) {
    return "About 1 minute";
  }

  return "About 2 minutes";
};

export const formatReviewExerciseLabel = (
  exerciseType: ReviewCard["exerciseType"],
): string => {
  switch (exerciseType) {
    case "meaning_in_context":
      return "Meaning in context";
    case "recognition_in_fresh_sentence":
      return "Fresh sentence";
    case "cloze_recall":
      return "Recall";
    case "contrastive_choice":
      return "Contrast";
    case "register_judgment":
      return "Tone";
    default:
      return "Review";
  }
};

export const formatReviewProgressLabel = (input: {
  card: Pick<ReviewCard, "position">;
  session: Pick<ReviewSessionDetail["session"], "cardCount">;
}): string =>
  `Card ${input.card.position + 1} of ${input.session.cardCount}`;

export const formatReviewRemainingLabel = (input: {
  context: "answering" | "feedback";
  session: Pick<ReviewSessionDetail["session"], "remainingCount">;
}): string => {
  if (input.context === "feedback") {
    return input.session.remainingCount > 0
      ? `${pluralize(input.session.remainingCount, "card")} left in this session`
      : "Ready to finish";
  }

  return input.session.remainingCount > 1
    ? `${pluralize(input.session.remainingCount, "card")} remaining`
    : "Last card";
};

export const getReviewQueueDisplayState = (
  queue: ReviewQueueSummary | null | undefined,
): ReviewQueueDisplayState => {
  if (queue?.activeSessionId) {
    return {
      actionLabel: "Resume session",
      canStart: true,
      facts: [
        {
          label: "Next",
          value: "Pick up the current card",
        },
      ],
      message:
        "Your session is still open. Pick up where you left off.",
      path: [
        "Resume the card in progress",
        "Finish the short session",
        "Return to your library",
      ],
      secondaryAction: {
        href: "/library",
        label: "Browse your words",
      },
      summary: "Session in progress",
    };
  }

  if ((queue?.dueCount ?? 0) > 0) {
    const approximateCardCount = getApproximateReviewCardCount(
      queue?.dueByDimension ?? {
        distinction: 0,
        recognition: 0,
        usage: 0,
      },
      queue?.dueCount ?? 0,
    );

    return {
      actionLabel: "Start a short session",
      canStart: true,
      facts: [
        {
          label: "Ready now",
          value: pluralize(queue?.dueCount ?? 0, "word"),
        },
        {
          label: "You’ll practice",
          value: formatDueDimensions(queue?.dueByDimension ?? {
            distinction: 0,
            recognition: 0,
            usage: 0,
          }),
        },
        {
          label: "Session",
          value: `${pluralize(approximateCardCount, "card")} · ${formatReviewSessionEstimate(
            approximateCardCount,
          )}`,
        },
      ],
      message:
        "Start a short session from the words due now. Gloss begins with the clearest meaning check, then only goes deeper where each word is ready for it.",
      path: [
        "Meaning first",
        (queue?.dueByDimension.distinction ?? 0) > 0 || (queue?.dueByDimension.usage ?? 0) > 0
          ? "Then compare or usage where it helps"
          : "Then stop once the word is clear",
        formatReviewSessionEstimate(approximateCardCount),
      ],
      secondaryAction: {
        href: "/library",
        label: "Browse your words",
      },
      summary: `${pluralize(queue?.dueCount ?? 0, "word")} ready now`,
    };
  }

  if ((queue?.availableCount ?? 0) > 0) {
    return {
      actionLabel: null,
      canStart: false,
      facts: [],
      message:
        "Nothing is due yet. Browse your library now, then come back once a word is ready.",
      path: [],
      secondaryAction: {
        href: "/library",
        label: "Browse your words",
      },
      summary: "Nothing due yet",
    };
  }

  if ((queue?.capturedCount ?? 0) > 0) {
    return {
      actionLabel: null,
      canStart: false,
      facts: [
        {
          label: "Saved",
          value: pluralize(queue?.capturedCount ?? 0, "word"),
        },
      ],
      message:
        "Your saved words are still being prepared for review. Browse the library now, or come back once the first word is ready.",
      path: [],
      secondaryAction: {
        href: "/library",
        label: "Browse your words",
      },
      summary: "Preparing review",
    };
  }

  return {
    actionLabel: null,
    canStart: false,
    facts: [],
    message:
      "You do not have anything to review yet. Save a word first, then come back once it is ready.",
    path: [],
    secondaryAction: {
      href: "/capture",
      label: "Save your first word",
    },
    summary: "Nothing to review yet",
  };
};

const buildReviewFeedbackExplanation = (input: {
  card: ReviewCard;
  correctAnswerLabel: string;
}): string => {
  switch (input.card.promptPayload.type) {
    case "contrastive_choice":
      return `${toSentenceCase(input.correctAnswerLabel)} fits this sentence better.`;
    case "cloze_recall":
      return `The missing word is ${toQuotedText(input.correctAnswerLabel)}. It is the word this sentence is trying to recover.`;
    case "register_judgment":
      return `${toQuotedText(input.correctAnswerLabel)} is the less natural tone here.`;
    case "recognition_in_fresh_sentence":
      return `In this fresh sentence, ${input.card.promptPayload.word} means ${toQuotedText(
        toDictionaryDefinition(input.correctAnswerLabel),
      )}`;
    case "meaning_in_context":
    default:
      return `Here, ${input.card.promptPayload.word} means ${toQuotedText(
        toDictionaryDefinition(input.correctAnswerLabel),
      )}`;
  }
};

export const getReviewFeedbackDisplayState = (
  feedback: ReviewFeedbackSnapshot,
): ReviewFeedbackDisplayState => {
  const submittedAnswerLabel =
    feedback.submission.type === "choice"
      ? getChoiceDisplayLabel(
          getChoiceById(feedback.card, feedback.submission.choiceId),
        )
      : feedback.submission.text;
  const correctAnswerLabel =
    feedback.result.submissionType === "choice"
      ? getChoiceDisplayLabel(
          getChoiceById(feedback.card, feedback.result.correctChoiceId),
        )
      : feedback.result.expectedText;

  return {
    correctAnswerLabel,
    explanation: buildReviewFeedbackExplanation({
      card: feedback.card,
      correctAnswerLabel,
    }),
    message: feedback.result.correct
      ? feedback.result.submissionType === "text"
        ? "You pulled back the right word from the sentence."
        : "You matched the meaning this card was testing."
      : `Not quite. You gave ${toQuotedText(
          submittedAnswerLabel ?? "Unavailable",
        )}. Here, the better fit is ${toQuotedText(correctAnswerLabel)}`,
    submittedAnswerLabel,
    status: feedback.result.correct ? "correct" : "incorrect",
    title: feedback.result.correct ? "You’ve got it" : "Not quite yet",
  };
};

const getReviewSessionWordCount = (session: ReviewSessionDetail): number =>
  new Set(session.cards.map((card) => card.seedId)).size;

export const getReviewCardHeading = (card: ReviewCard): string =>
  "word" in card.promptPayload ? card.promptPayload.word : "Recall the word";

export const getReviewCompletionDisplayState = (input: {
  session: ReviewSessionDetail;
}): ReviewCompletionDisplayState => {
  const wordCount = getReviewSessionWordCount(input.session);

  return {
    actionLabel: "Back to the queue",
    message: `You finished ${pluralize(
      input.session.session.cardCount,
      "card",
    )}. Gloss has already adjusted when ${pluralize(
      wordCount,
      "word",
    )} should come back next.`,
    summary: `${pluralize(input.session.session.cardCount, "card")} across ${pluralize(
      wordCount,
      "word",
    )}`,
    secondaryAction: {
      href: "/library",
      label: "Browse your words",
    },
    title: "Nice work",
  };
};

export const getReviewRouteState = (input: {
  feedback: ReviewFeedbackSnapshot | null;
  isInitialLoading: boolean;
  session: ReviewSessionDetail | null;
}): ReviewRouteState => {
  if (input.isInitialLoading) {
    return {
      kind: "loading",
    };
  }

  if (input.feedback && input.session) {
    return {
      feedback: input.feedback,
      kind: "feedback",
      session: input.session,
    };
  }

  if (input.session?.session.status === "completed") {
    return {
      kind: "complete",
      session: input.session,
    };
  }

  const currentCard = getCurrentCard(input.session);

  if (input.session && currentCard) {
    return {
      card: currentCard,
      kind: "card",
      session: input.session,
    };
  }

  return {
    kind: "queue",
  };
};

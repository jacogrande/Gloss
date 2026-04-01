import type {
  ReviewCard,
  ReviewQueueSummary,
  ReviewSessionDetail,
  ReviewSubmissionResult,
} from "@gloss/shared/types";

type ReviewChoice = ReviewCard["promptPayload"]["choices"][number];

type ReviewActionLink = {
  href: string;
  label: string;
};

export type ReviewQueueDisplayState = {
  actionLabel: string | null;
  canStart: boolean;
  message: string;
  secondaryAction: ReviewActionLink | null;
  summary: string;
};

export type ReviewFeedbackSnapshot = {
  card: ReviewCard;
  result: ReviewSubmissionResult;
  selectedChoiceId: string;
};

export type ReviewFeedbackDisplayState = {
  correctChoiceLabel: string;
  explanation: string;
  selectedChoiceLabel: string | null;
  status: "correct" | "incorrect";
  title: string;
};

export type ReviewCompletionDisplayState = {
  actionLabel: string;
  message: string;
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
  card.promptPayload.choices.find((choice) => choice.id === choiceId) ?? null;

const getChoiceDisplayLabel = (choice: ReviewChoice | null): string =>
  choice?.detail ?? choice?.label ?? "Unavailable";

const trimTerminalPunctuation = (value: string): string =>
  value.trim().replace(/[.!?]+$/u, "");

const toSentenceCase = (value: string): string =>
  value.length === 0 ? value : `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;

const toQuotedSentence = (value: string): string => `“${trimTerminalPunctuation(value)}.”`;

const contextualLeadPatterns = [
  /^in this (?:sentence|context|passage|usage),?\s*(?:it\s+)?means\s+/iu,
  /^in this kind of (?:sentence|context|passage|usage),?\s*(?:it\s+)?(?:means|describes|refers to)\s+/iu,
  /^here,?\s*(?:it\s+)?means\s+/iu,
  /^here,?\s*/iu,
  /^in context,?\s*(?:it\s+)?means\s+/iu,
  /^used here,?\s*(?:it\s+)?means\s+/iu,
];

const normalizeGlossChoiceLabel = (value: string): string => {
  const trimmedValue = value.trim();

  for (const pattern of contextualLeadPatterns) {
    if (!pattern.test(trimmedValue)) {
      continue;
    }

    return toSentenceCase(trimmedValue.replace(pattern, "").trim());
  }

  return trimmedValue;
};

export const formatReviewExerciseLabel = (
  exerciseType: ReviewCard["exerciseType"],
): string => {
  switch (exerciseType) {
    case "meaning_in_context":
      return "Meaning in context";
    case "recognition_in_fresh_sentence":
      return "Fresh sentence";
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
      message:
        "Your session is still open. Pick up where you left off.",
      secondaryAction: {
        href: "/library",
        label: "Browse your words",
      },
      summary: "Session in progress",
    };
  }

  if ((queue?.dueCount ?? 0) > 0) {
    return {
      actionLabel: "Start review",
      canStart: true,
      message:
        "Start a short session from the words due now. One word may turn into more than one card.",
      secondaryAction: {
        href: "/library",
        label: "Browse your words",
      },
      summary: `${pluralize(queue?.dueCount ?? 0, "word")} due now`,
    };
  }

  if ((queue?.availableCount ?? 0) > 0) {
    return {
      actionLabel: null,
      canStart: false,
      message:
        "Nothing is due yet. Browse your library now, then come back once a word is ready.",
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
      message:
        "Your saved words are still being prepared for review. Give them a moment, or browse your library.",
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
    message:
      "You do not have anything to review yet. Save a word first, then come back once it is ready.",
    secondaryAction: {
      href: "/capture",
      label: "Capture your first word",
    },
    summary: "Nothing to review yet",
  };
};

const buildReviewFeedbackExplanation = (input: {
  card: ReviewCard;
  correctChoiceLabel: string;
}): string => {
  switch (input.card.exerciseType) {
    case "contrastive_choice":
      return `${toSentenceCase(input.correctChoiceLabel)} fits this sentence better.`;
    case "register_judgment":
      return `${toQuotedSentence(input.correctChoiceLabel)} is the less natural tone here.`;
    case "recognition_in_fresh_sentence":
      return `In this fresh sentence, ${input.card.promptPayload.word} means ${trimTerminalPunctuation(
        normalizeGlossChoiceLabel(input.correctChoiceLabel),
      ).toLowerCase()}.`;
    case "meaning_in_context":
    default:
      return `Here, ${input.card.promptPayload.word} means ${trimTerminalPunctuation(
        normalizeGlossChoiceLabel(input.correctChoiceLabel),
      ).toLowerCase()}.`;
  }
};

export const getReviewFeedbackDisplayState = (
  feedback: ReviewFeedbackSnapshot,
): ReviewFeedbackDisplayState => {
  const selectedChoice = getChoiceById(
    feedback.card,
    feedback.selectedChoiceId,
  );
  const correctChoice = getChoiceById(
    feedback.card,
    feedback.result.correctChoiceId,
  );
  const correctChoiceLabel = getChoiceDisplayLabel(correctChoice);

  return {
    correctChoiceLabel,
    explanation: buildReviewFeedbackExplanation({
      card: feedback.card,
      correctChoiceLabel,
    }),
    selectedChoiceLabel: getChoiceDisplayLabel(selectedChoice),
    status: feedback.result.correct ? "correct" : "incorrect",
    title: feedback.result.correct ? "Correct" : "Not quite",
  };
};

export const getReviewCompletionDisplayState = (input: {
  queue: ReviewQueueSummary | null | undefined;
  session: ReviewSessionDetail;
}): ReviewCompletionDisplayState => {
  if ((input.queue?.dueCount ?? 0) > 0) {
    return {
      actionLabel: "Back to review queue",
      message: `You finished ${pluralize(
        input.session.session.cardCount,
        "card",
      )}. ${pluralize(input.queue?.dueCount ?? 0, "word")} ${input.queue?.dueCount === 1 ? "is" : "are"} still due when you want another short session.`,
      secondaryAction: {
        href: "/library",
        label: "Browse your words",
      },
      title: "Session finished",
    };
  }

  return {
    actionLabel: "Back to review queue",
    message: `You finished ${pluralize(
      input.session.session.cardCount,
      "card",
    )}. Your queue is clear for now.`,
    secondaryAction: {
      href: "/library",
      label: "Browse your words",
    },
    title: "Session finished",
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

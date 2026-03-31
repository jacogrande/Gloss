import type { ReviewQueueSummary } from "@gloss/shared/types";

export type ReviewQueueDisplayState = {
  actionLabel: string | null;
  canStart: boolean;
  message: string;
  secondaryAction:
    | null
    | {
        href: string;
        label: string;
      };
};

export const getReviewQueueDisplayState = (
  queue: ReviewQueueSummary | null | undefined,
): ReviewQueueDisplayState => {
  if (queue?.activeSessionId) {
    return {
      actionLabel: "Resume session",
      canStart: true,
      message: "Your session is still open. Pick up where you left off.",
      secondaryAction: {
        href: "/library",
        label: "Browse your words",
      },
    };
  }

  if ((queue?.dueCount ?? 0) > 0) {
    return {
      actionLabel: "Start review",
      canStart: true,
      message: "Start a short session built from the words that are due now.",
      secondaryAction: {
        href: "/library",
        label: "Browse your words",
      },
    };
  }

  if ((queue?.availableCount ?? 0) > 0) {
    return {
      actionLabel: null,
      canStart: false,
      message:
        "Nothing is due right now. Come back later, or browse your library in the meantime.",
      secondaryAction: {
        href: "/library",
        label: "Browse your words",
      },
    };
  }

  if ((queue?.capturedCount ?? 0) > 0) {
    return {
      actionLabel: null,
      canStart: false,
      message:
        "Nothing is ready to review yet. Give your saved words a moment, or browse your library in the meantime.",
      secondaryAction: {
        href: "/library",
        label: "Browse your words",
      },
    };
  }

  return {
    actionLabel: null,
    canStart: false,
    message:
      "You do not have anything to review yet. Capture a word first, then come back once it is ready.",
    secondaryAction: {
      href: "/capture",
      label: "Capture your first word",
    },
  };
};

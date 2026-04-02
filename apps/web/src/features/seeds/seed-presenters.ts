import type {
  SeedContext,
  SeedDetail,
  SeedEnrichment,
  SeedEnrichmentLexicalPreview,
  SeedStage,
  SourceKind,
} from "@gloss/shared/types";

const annotationDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const startCase = (value: string): string =>
  value
    .split(/[-_\s]+/u)
    .filter((part) => part.length > 0)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");

export const formatAnnotationDate = (value: string): string =>
  annotationDateFormatter.format(new Date(value));

export const formatSeedStageLabel = (value: SeedStage): string => startCase(value);

export const formatSourceKindLabel = (value: SourceKind): string => startCase(value);

export const getSeedStageBadge = (value: SeedStage): string | null =>
  value === "new" ? "New" : null;

export const formatSourceEvidence = (
  source: Pick<NonNullable<SeedDetail["source"]>, "author" | "kind" | "title"> | null,
): string | null => {
  if (!source) {
    return null;
  }

  const parts = [
    source.title,
    source.author,
    formatSourceKindLabel(source.kind),
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" · ") : null;
};

export const getAdditionalContexts = (
  seed: Pick<SeedDetail, "contexts" | "primarySentence">,
): SeedContext[] =>
  seed.contexts.filter(
    (context) =>
      context.text.trim() !== seed.primarySentence?.trim() &&
      context.text.trim().length > 0,
  );

export type SeedCaptureNotice = {
  message: string;
  title: string;
};

export type SeedRecoveryState = {
  message: string;
  sentenceLabel: string;
  sentencePlaceholder: string;
  title: string;
};

export type SeedActionState = {
  primary: {
    href: string;
    label: string;
  };
  secondary?: {
    href: string;
    label: string;
  };
};

export type SeedCompareItem = {
  label: string;
  note: string;
  word: string | null;
};

export type SeedEnrichmentFallbackView = {
  actionLabel: string | null;
  actionKind: "refresh" | "retry" | null;
  canAct: boolean;
  message: string;
  title: string;
  variant: "failed" | "pending";
};

export type SeedEnrichmentLoadingStep = {
  body: string;
  status: "active" | "complete" | "pending";
  title: string;
};

const hasWeakEnrichmentFailure = (
  enrichment: SeedEnrichment | null,
): boolean =>
  enrichment?.status === "failed" &&
  enrichment.errorCode === "ENRICHMENT_EVIDENCE_UNAVAILABLE";

export const getSeedEnrichmentFallbackView = (input: {
  enrichment: SeedEnrichment | null | undefined;
  errorMessage: string | null;
  isEnriching: boolean;
  showManualRefresh: boolean;
}): SeedEnrichmentFallbackView | null => {
  if (input.errorMessage && !input.isEnriching && !input.enrichment) {
    return {
      actionLabel: "Try again",
      actionKind: "retry",
      canAct: true,
      message: input.errorMessage,
      title: "Definition",
      variant: "failed",
    };
  }

  if (input.enrichment?.status === "pending" && input.errorMessage && !input.isEnriching) {
    return {
      actionLabel: "Check again",
      actionKind: "refresh",
      canAct: true,
      message: input.errorMessage,
      title: "Definition",
      variant: "pending",
    };
  }

  if (input.isEnriching || input.enrichment?.status === "pending" || !input.enrichment) {
    return {
      actionLabel: input.showManualRefresh ? "Check again" : null,
      actionKind: input.showManualRefresh ? "refresh" : null,
      canAct: input.showManualRefresh,
      message: input.showManualRefresh
        ? "Still loading? Check again."
        : "Building the definition. It will appear here automatically.",
      title: "Definition",
      variant: "pending",
    };
  }

  if (input.enrichment.status === "failed") {
    const message =
      input.errorMessage ??
      (() => {
        switch (input.enrichment?.errorCode) {
          case "ENRICHMENT_EVIDENCE_UNAVAILABLE":
            return "Not enough context yet.";
          case "ENRICHMENT_SCHEMA_INVALID":
            return "The response was invalid.";
          case "ENRICHMENT_PROVIDER_ERROR":
            return "The provider did not return a usable result.";
          default:
            return "Not available yet.";
        }
      })();

    const canRetry = input.enrichment.errorCode !== "ENRICHMENT_EVIDENCE_UNAVAILABLE";

    return {
      actionLabel: canRetry ? "Try again" : null,
      actionKind: canRetry ? "retry" : null,
      canAct: canRetry,
      message,
      title: "Definition",
      variant: "failed",
    };
  }

  if (!input.enrichment.payload) {
    return {
      actionLabel: null,
      actionKind: null,
      canAct: false,
      message: "No definition available.",
      title: "Definition",
      variant: "failed",
    };
  }

  return null;
};

export const getSeedCaptureNotice = (input: {
  savedFromCapture: boolean;
  seed: Pick<SeedDetail, "primarySentence" | "source">;
}): SeedCaptureNotice | null => {
  if (!input.savedFromCapture) {
    return null;
  }

  if (!input.seed.primarySentence && !input.seed.source) {
    return {
      message:
        "Your word is saved. Merriam-Webster lands first. Add a sentence if you want Gloss to shape the meaning to your reading.",
      title: "Saved",
    };
  }

  return {
    message:
      "Your word is saved. Merriam-Webster lands first, then Gloss shapes the meaning to your sentence and sends it to review.",
    title: "Saved",
  };
};

export const getSeedRecoveryState = (
  input: {
    seed: Pick<SeedDetail, "enrichment" | "primarySentence" | "source">;
  },
): SeedRecoveryState | null => {
  if (hasWeakEnrichmentFailure(input.seed.enrichment)) {
    return {
      message:
        "Paste the sentence where you found this word, or add source details. Gloss needs that context to try again.",
      sentenceLabel: "Sentence from your reading",
      sentencePlaceholder: "Paste the sentence where you saw this word.",
      title: "Give this word more context",
    };
  }

  if (!input.seed.primarySentence && !input.seed.source) {
    return {
      message:
        "Paste the sentence where you found this word, or add source details. Gloss uses that context to build the definition and review cards.",
      sentenceLabel: "Sentence from your reading",
      sentencePlaceholder: "Paste the sentence where you saw this word.",
      title: "Give this word more context",
    };
  }

  if (!input.seed.primarySentence) {
    return {
      message:
        "Paste the sentence where you found this word. Gloss can rebuild the definition once you save it.",
      sentenceLabel: "Sentence from your reading",
      sentencePlaceholder: "Paste the sentence where you saw this word.",
      title: "Add the sentence",
    };
  }

  return null;
};

export const getSeedLoadNotice = (
  errorMessage: string | null,
): SeedCaptureNotice | null =>
  errorMessage
    ? {
        message: `${errorMessage} Showing the last saved version for now.`,
        title: "Couldn’t refresh",
      }
    : null;

export const getSeedEnrichmentLoadingSteps = (input: {
  isRefreshing: boolean;
  lexicalPreview: SeedEnrichmentLexicalPreview | null;
}): SeedEnrichmentLoadingStep[] => {
  if (!input.lexicalPreview) {
    return [
      {
        body: "Opening Merriam-Webster and locating the right headword.",
        status: "active",
        title: "Finding the word",
      },
      {
        body: "The first grounded definition will appear here as soon as it lands.",
        status: "pending",
        title: "Lifting the clean definition",
      },
      {
        body: "After that, Gloss reshapes the meaning to match your sentence.",
        status: "pending",
        title: "Reading your context",
      },
    ];
  }

  return [
    {
      body: "This word is anchored to a Merriam-Webster entry.",
      status: "complete",
      title: "Word found",
    },
    {
      body: "The first dictionary sense is ready.",
      status: "complete",
      title: "Definition lifted",
    },
    {
      body: input.isRefreshing
        ? "Checking again for the contextual pass."
        : "Gloss is shaping that definition to the exact sentence you saved.",
      status: "active",
      title: "Reading your context",
    },
  ];
};

export const getSeedContextSourceToggleLabel = (input: {
  hasSourceValues: boolean;
  isSourceOpen: boolean;
}): string => {
  if (input.isSourceOpen) {
    return "Hide source details";
  }

  return input.hasSourceValues ? "Edit source details" : "Add source details";
};

export const getSeedCompareItems = (
  payload: NonNullable<SeedDetail["enrichment"]>["payload"] | null,
): SeedCompareItem[] => {
  if (!payload) {
    return [];
  }

  return [
    payload.registerNote
      ? {
          label: "Tone",
          note: payload.registerNote,
          word: null,
        }
      : null,
    payload.relatedWord
      ? {
          label: "Similar",
          note: payload.relatedWord.note,
          word: payload.relatedWord.word,
        }
      : null,
    payload.contrastiveWord
      ? {
          label: "Contrast",
          note: payload.contrastiveWord.note,
          word: payload.contrastiveWord.word,
        }
      : null,
  ].filter((item): item is SeedCompareItem => item !== null);
};

export const getSeedActionState = (input: {
  seed: Pick<SeedDetail, "enrichment">;
}): SeedActionState | null => {
  if (input.seed.enrichment?.status === "ready") {
    return {
      primary: {
        href: "/review",
        label: "Review queue",
      },
      secondary: {
        href: "/capture",
        label: "Save another word",
      },
    };
  }

  if (
    input.seed.enrichment?.status === "pending" ||
    input.seed.enrichment?.status === "failed"
  ) {
    return {
      primary: {
        href: "/capture",
        label: "Save another word",
      },
    };
  }

  return null;
};

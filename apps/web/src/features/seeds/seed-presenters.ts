import type {
  SeedContext,
  SeedDetail,
  SeedEnrichment,
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

const capitalizeFirstLetter = (value: string): string =>
  value.length === 0 ? value : `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;

const contextualGlossPatterns = [
  /^in this (?:sentence|context|passage|usage),?\s*(?:it\s+)?means\s+/iu,
  /^in this case,?\s*(?:it\s+)?means\s+/iu,
  /^here,?\s*(?:it\s+)?means\s+/iu,
  /^here,?\s*/iu,
  /^in context,?\s*(?:it\s+)?means\s+/iu,
  /^used here,?\s*(?:it\s+)?means\s+/iu,
];

export const toDictionaryDefinition = (value: string): string => {
  const trimmedValue = value.trim();

  for (const pattern of contextualGlossPatterns) {
    if (!pattern.test(trimmedValue)) {
      continue;
    }

    return capitalizeFirstLetter(trimmedValue.replace(pattern, "").trim());
  }

  return trimmedValue;
};

export const shouldShowContextualGloss = (
  dictionaryDefinition: string,
  contextualGloss: string,
): boolean => dictionaryDefinition.trim() !== contextualGloss.trim();

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
  title: string;
};

const hasWeakEnrichmentFailure = (
  enrichment: SeedEnrichment | null,
): boolean =>
  enrichment?.status === "failed" &&
  enrichment.errorCode === "ENRICHMENT_EVIDENCE_UNAVAILABLE";

export const getSeedCaptureNotice = (input: {
  savedFromCapture: boolean;
  seed: Pick<SeedDetail, "primarySentence" | "source">;
}): SeedCaptureNotice | null => {
  if (!input.savedFromCapture) {
    return null;
  }

  if (!input.seed.primarySentence && !input.seed.source) {
    return {
      message: "Add a sentence or source details if you want a stronger definition and better review prompts.",
      title: "Saved",
    };
  }

  return {
    message: "Your word is saved. Enrichment is running in the background.",
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
      message: "Add a sentence or source details, then try enrichment again.",
      title: "Add context",
    };
  }

  if (!input.seed.primarySentence && !input.seed.source) {
    return {
      message: "A sentence or source note gives this word a better definition and better review cards.",
      title: "Add context",
    };
  }

  if (!input.seed.primarySentence) {
    return {
      message: "Add a sentence if you want a stronger definition and better review prompts.",
      title: "Add context",
    };
  }

  return null;
};

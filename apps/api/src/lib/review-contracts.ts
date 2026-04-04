import {
  reviewCardPromptPayloadSchemaVersion,
  reviewCardSchema,
  reviewQueueSummarySchema,
  reviewSessionDetailSchema,
  reviewSessionSummarySchema,
  reviewStateSchema,
} from "@gloss/shared/contracts";
import type {
  ReviewAnswerKey,
  ReviewCard,
  ReviewCardPromptPayload,
  ReviewDimension,
  ReviewExerciseType,
  ReviewGenerationSource,
  ReviewOutcome,
  ReviewQueueSummary,
  ReviewSessionDetail,
  ReviewState,
  ReviewSubmissionInput,
  SeedDetail,
  SeedStage,
} from "@gloss/shared/types";

import type {
  ReviewCardRow,
  ReviewSessionRow,
  ReviewStateRow,
} from "../db/schema";
import { normalizeWord } from "./seed-contracts";

export const reviewSchedulerVersion = "review-scheduler.v1" as const;
export const reviewCardPromptTemplateVersion = "review-card.v2" as const;

type ReviewSeedCandidate = {
  reviewState: ReviewStateRow | null;
  seed: SeedDetail;
};

export type ReviewTarget = {
  dimension: ReviewDimension;
  exerciseType: ReviewExerciseType;
  reviewState: ReviewStateRow | null;
  seed: SeedDetail;
};

export type ReviewCardDraft = {
  answerKey: ReviewAnswerKey;
  dimension: ReviewDimension;
  exerciseType: ReviewExerciseType;
  generationSource: ReviewGenerationSource;
  model: string | null;
  promptPayload: ReviewCardPromptPayload;
  promptTemplateVersion: string;
  provider: string | null;
  schemaVersion: typeof reviewCardPromptPayloadSchemaVersion;
  seedId: string;
  trace: ReviewCardTraceDraft;
};

export type ReviewCardTraceDraft = {
  inputRedacted: Record<string, unknown> | null;
  outputRedacted: Record<string, unknown>;
  validationResult: {
    accepted: boolean;
    issues: string[];
  };
};

type ReviewDimensionSnapshot = {
  dueAt: Date;
  score: number;
};

const genericMeaningDistractors = [
  "It mainly refers to a person rather than a quality of language or thought.",
  "It suggests something casual or unserious rather than careful nuance.",
  "It points to physical movement more than meaning or tone.",
] as const;

const normalizeSentence = (value: string): string =>
  value.trim().replace(/\s+/g, " ");

const normalizeRecallAnswer = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

const normalizeSentenceForComparison = (value: string): string =>
  normalizeSentence(value).toLocaleLowerCase("en-US");

const createPhrasePattern = (value: string): RegExp => {
  const tokens = normalizeWord(value)
    .split(/\s+/u)
    .filter((token) => token.length > 0)
    .map(escapeRegExp);

  if (tokens.length === 0) {
    return /$^/u;
  }

  return new RegExp(
    `(^|[^\\p{L}\\p{N}])(${tokens.join("\\s+")})(?=$|[^\\p{L}\\p{N}])`,
    "iu",
  );
};

const containsNormalizedPhrase = (input: {
  phrase: string;
  text: string;
}): boolean => createPhrasePattern(input.phrase).test(normalizeSentence(input.text));

const replaceFirstPhraseOccurrence = (input: {
  replacement: string;
  sentence: string;
  word: string;
}): string =>
  input.sentence.replace(
    createPhrasePattern(input.word),
    (_, prefix: string) => `${prefix}${input.replacement}`,
  );

export const isSentenceVerbatimReuse = (input: {
  candidateSentence: string;
  capturedSentence: string;
}): boolean =>
  normalizeSentenceForComparison(input.candidateSentence) ===
  normalizeSentenceForComparison(input.capturedSentence);

const createBlankedCapturedSentence = (input: {
  capturedSentence: string;
  word: string;
}): string =>
  normalizeSentence(
    replaceFirstPhraseOccurrence({
      replacement: "____",
      sentence: input.capturedSentence,
      word: input.word,
    }),
  );

const getRecognitionPromptIssues = (input: {
  capturedSentence?: string | null;
  promptPayload: Extract<
    ReviewCardPromptPayload,
    {
      type: "recognition_in_fresh_sentence";
    }
  >;
}): string[] => {
  if (
    typeof input.capturedSentence !== "string" ||
    input.capturedSentence.trim().length === 0
  ) {
    return [];
  }

  return isSentenceVerbatimReuse({
    candidateSentence: input.promptPayload.sentence,
    capturedSentence: input.capturedSentence,
  })
    ? ["Recognition prompt must not repeat the captured sentence."]
    : [];
};

const getClozePromptIssues = (input: {
  capturedSentence?: string | null;
  promptPayload: Extract<
    ReviewCardPromptPayload,
    {
      type: "cloze_recall";
    }
  >;
  word: string;
}): string[] => {
  const issues: string[] = [];
  const normalizedWord = normalizeWord(input.word);

  if (!input.promptPayload.sentence.includes("____")) {
    issues.push("Cloze recall sentence must include a visible blank marker.");
  }

  if (
    containsNormalizedPhrase({
      phrase: normalizedWord,
      text: input.promptPayload.question,
    }) ||
    containsNormalizedPhrase({
      phrase: normalizedWord,
      text: input.promptPayload.sentence,
    })
  ) {
    issues.push("Cloze recall prompt must not leak the answer.");
  }

  if (
    typeof input.capturedSentence === "string" &&
    input.capturedSentence.trim().length > 0 &&
    normalizeSentenceForComparison(input.promptPayload.sentence) ===
      normalizeSentenceForComparison(
        createBlankedCapturedSentence({
          capturedSentence: input.capturedSentence,
          word: input.word,
        }),
      )
  ) {
    issues.push("Cloze recall prompt must not repeat the captured sentence.");
  }

  return issues;
};

const toSentenceCase = (value: string): string => {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return trimmed;
  }

  return `${trimmed[0]?.toUpperCase() ?? ""}${trimmed.slice(1)}`;
};

const stripContextualLead = (value: string): string =>
  value
    .replace(/^in this (sentence|context|kind of context),\s*/iu, "")
    .replace(/^here,\s*/iu, "")
    .replace(/^it means\s*/iu, "")
    .replace(/^it suggests\s*/iu, "")
    .replace(/^it describes\s*/iu, "")
    .trim()
    .replace(/\s+/g, " ");

const ensureTerminalPunctuation = (value: string): string =>
  /[.!?]$/u.test(value) ? value : `${value}.`;

const createChoiceId = (index: number): string => `choice_${index + 1}`;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

const rotateChoices = <TValue>(
  values: readonly TValue[],
  seedWord: string,
): TValue[] => {
  if (values.length <= 1) {
    return [...values];
  }

  const offset = normalizeWord(seedWord).length % values.length;

  return values.map((_, index) => values[(index + offset) % values.length] as TValue);
};

const dedupeStrings = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    const normalized = normalizeWord(value);

    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    deduped.push(value.trim());
  }

  return deduped;
};

const createAcceptedTraceDraft = (input: {
  inputRedacted?: Record<string, unknown> | null;
  outputRedacted: Record<string, unknown>;
}): ReviewCardTraceDraft => ({
  inputRedacted: input.inputRedacted ?? null,
  outputRedacted: input.outputRedacted,
  validationResult: {
    accepted: true,
    issues: [],
  },
});

const getDimensionSnapshot = (
  state: ReviewStateRow | null,
  dimension: ReviewDimension,
): ReviewDimensionSnapshot => {
  if (!state) {
    return {
      dueAt: new Date(0),
      score: 0,
    };
  }

  switch (dimension) {
    case "distinction":
      return {
        dueAt: state.distinctionDueAt,
        score: state.distinctionScore,
      };
    case "usage":
      return {
        dueAt: state.usageDueAt,
        score: state.usageScore,
      };
    case "recognition":
    default:
      return {
        dueAt: state.recognitionDueAt,
        score: state.recognitionScore,
      };
  }
};

const setDimensionSnapshot = (
  state: ReviewStateRow | null,
  dimension: ReviewDimension,
  nextSnapshot: ReviewDimensionSnapshot,
  sessionId: string,
  now: Date,
  seedId: string,
  stateId: string,
): {
  distinctionDueAt: Date;
  distinctionScore: number;
  id: string;
  lastReviewedAt: Date;
  lastSessionId: string;
  recognitionDueAt: Date;
  recognitionScore: number;
  schedulerVersion: string;
  seedId: string;
  usageDueAt: Date;
  usageScore: number;
} => {
  const base = state
    ? {
        distinctionDueAt: state.distinctionDueAt,
        distinctionScore: state.distinctionScore,
        id: state.id,
        recognitionDueAt: state.recognitionDueAt,
        recognitionScore: state.recognitionScore,
        usageDueAt: state.usageDueAt,
        usageScore: state.usageScore,
      }
    : {
        distinctionDueAt: new Date(0),
        distinctionScore: 0,
        id: stateId,
        recognitionDueAt: new Date(0),
        recognitionScore: 0,
        usageDueAt: new Date(0),
        usageScore: 0,
      };

  switch (dimension) {
    case "distinction":
      return {
        ...base,
        distinctionDueAt: nextSnapshot.dueAt,
        distinctionScore: nextSnapshot.score,
        lastReviewedAt: now,
        lastSessionId: sessionId,
        schedulerVersion: reviewSchedulerVersion,
        seedId,
      };
    case "usage":
      return {
        ...base,
        lastReviewedAt: now,
        lastSessionId: sessionId,
        schedulerVersion: reviewSchedulerVersion,
        seedId,
        usageDueAt: nextSnapshot.dueAt,
        usageScore: nextSnapshot.score,
      };
    case "recognition":
    default:
      return {
        ...base,
        lastReviewedAt: now,
        lastSessionId: sessionId,
        recognitionDueAt: nextSnapshot.dueAt,
        recognitionScore: nextSnapshot.score,
        schedulerVersion: reviewSchedulerVersion,
        seedId,
      };
  }
};

const getStageRank = (value: SeedStage): number => {
  switch (value) {
    case "new":
      return 0;
    case "stabilizing":
      return 1;
    case "deepening":
      return 2;
    case "mature":
    default:
      return 3;
  }
};

const getSupportedExerciseTypes = (seed: SeedDetail): ReviewExerciseType[] => {
  if (!seed.enrichment?.payload) {
    return [];
  }

  return [
    "meaning_in_context",
    "recognition_in_fresh_sentence",
    ...((seed.primarySentence ?? seed.contexts[0]?.text)
      ? (["cloze_recall"] as const)
      : []),
    ...(seed.enrichment.payload.contrastiveWord
      ? (["contrastive_choice"] as const)
      : []),
    ...(seed.enrichment.payload.registerNote
      ? (["register_judgment"] as const)
      : []),
  ];
};

const chooseExerciseForDimension = (
  dimension: ReviewDimension,
  supportedExerciseTypes: readonly ReviewExerciseType[],
  score: number,
): ReviewExerciseType | null => {
  if (dimension === "distinction") {
    return supportedExerciseTypes.includes("contrastive_choice")
      ? "contrastive_choice"
      : null;
  }

  if (dimension === "usage") {
    return supportedExerciseTypes.includes("register_judgment")
      ? "register_judgment"
      : null;
  }

  return score === 0 &&
    supportedExerciseTypes.includes("meaning_in_context")
    ? "meaning_in_context"
    : score >= 2 && supportedExerciseTypes.includes("cloze_recall")
      ? "cloze_recall"
    : supportedExerciseTypes.includes("recognition_in_fresh_sentence")
      ? "recognition_in_fresh_sentence"
        : supportedExerciseTypes.includes("meaning_in_context")
        ? "meaning_in_context"
        : supportedExerciseTypes[0] ?? null;
};

const buildTargetPriority = (input: {
  candidate: ReviewSeedCandidate;
  dimension: ReviewDimension;
  now: Date;
}): {
  dueAtMs: number;
  isDue: boolean;
  score: number;
  stageRank: number;
} => {
  const snapshot = getDimensionSnapshot(input.candidate.reviewState, input.dimension);

  return {
    dueAtMs: snapshot.dueAt.getTime(),
    isDue: snapshot.dueAt.getTime() <= input.now.getTime(),
    score: snapshot.score,
    stageRank: getStageRank(input.candidate.seed.stage),
  };
};

export const selectDueReviewTargets = (input: {
  candidates: ReviewSeedCandidate[];
  limit: number;
  now: Date;
}): ReviewTarget[] => {
  const rankedTargets = input.candidates.flatMap((candidate) => {
    const supportedExerciseTypes = getSupportedExerciseTypes(candidate.seed);

    return (["recognition", "distinction", "usage"] as const)
      .map((dimension) => {
        const snapshot = getDimensionSnapshot(candidate.reviewState, dimension);
        const exerciseType = chooseExerciseForDimension(
          dimension,
          supportedExerciseTypes,
          snapshot.score,
        );

        if (!exerciseType) {
          return null;
        }

        const priority = buildTargetPriority({
          candidate,
          dimension,
          now: input.now,
        });

        return {
          ...priority,
          dimension,
          exerciseType,
          reviewState: candidate.reviewState,
          seed: candidate.seed,
        };
      })
      .filter((value): value is ReviewTarget & {
        dueAtMs: number;
        isDue: boolean;
        score: number;
        stageRank: number;
      } => value !== null && value.isDue);
  });

  rankedTargets.sort((left, right) => {
    if (left.isDue !== right.isDue) {
      return left.isDue ? -1 : 1;
    }

    if (left.score !== right.score) {
      return left.score - right.score;
    }

    if (left.dueAtMs !== right.dueAtMs) {
      return left.dueAtMs - right.dueAtMs;
    }

    if (left.stageRank !== right.stageRank) {
      return left.stageRank - right.stageRank;
    }

    return left.seed.createdAt.localeCompare(right.seed.createdAt);
  });

  const selected: ReviewTarget[] = [];
  const perSeedCount = new Map<string, number>();
  const seenSeedDimension = new Set<string>();

  for (const candidate of rankedTargets) {
    if (selected.length >= input.limit) {
      break;
    }

    const seedCount = perSeedCount.get(candidate.seed.id) ?? 0;
    const seedDimensionKey = `${candidate.seed.id}:${candidate.dimension}`;

    if (seedCount >= 2 || seenSeedDimension.has(seedDimensionKey)) {
      continue;
    }

    selected.push({
      dimension: candidate.dimension,
      exerciseType: candidate.exerciseType,
      reviewState: candidate.reviewState,
      seed: candidate.seed,
    });
    perSeedCount.set(candidate.seed.id, seedCount + 1);
    seenSeedDimension.add(seedDimensionKey);
  }

  return selected;
};

const buildMeaningChoices = (seed: SeedDetail): {
  choices: Extract<
    ReviewCardPromptPayload,
    {
      type: "meaning_in_context";
    }
  >["choices"];
  correctChoiceId: string;
} => {
  const payload = seed.enrichment?.payload;

  if (!payload) {
    throw new Error("Meaning card requires an enrichment payload.");
  }

  const correctChoice = stripContextualLead(payload.gloss);
  const distractors = dedupeStrings([
    payload.contrastiveWord
      ? `It means something closer to ${payload.contrastiveWord.word}.`
      : "",
    payload.relatedWord
      ? `It simply names ${payload.relatedWord.word} itself.`
      : "",
    ...genericMeaningDistractors,
  ])
    .filter((value) => normalizeWord(value) !== normalizeWord(correctChoice))
    .slice(0, 2);
  const rotated = rotateChoices(
    [correctChoice, ...distractors].map((label, index) => ({
      id: createChoiceId(index),
      label: ensureTerminalPunctuation(toSentenceCase(label)),
    })),
    seed.word,
  );
  const correctChoiceId =
    rotated.find((choice) => normalizeWord(choice.label) === normalizeWord(ensureTerminalPunctuation(toSentenceCase(correctChoice))))?.id ??
    rotated[0]?.id ??
    "choice_1";

  return {
    choices: rotated,
    correctChoiceId,
  };
};

export const buildMeaningInContextCardDraft = (
  seed: SeedDetail,
): ReviewCardDraft => {
  const sentence = seed.primarySentence ?? seed.contexts[0]?.text ?? seed.word;
  const { choices, correctChoiceId } = buildMeaningChoices(seed);

  return {
    answerKey: {
      correctChoiceId,
      type: "choice",
    },
    dimension: "recognition",
    exerciseType: "meaning_in_context",
    generationSource: "template",
    model: null,
    promptPayload: {
      choices,
      question: `What does ${seed.word} mean here?`,
      sentence: normalizeSentence(sentence),
      type: "meaning_in_context",
      word: seed.word,
    },
    promptTemplateVersion: reviewCardPromptTemplateVersion,
    provider: null,
    schemaVersion: reviewCardPromptPayloadSchemaVersion,
    seedId: seed.id,
    trace: createAcceptedTraceDraft({
      outputRedacted: {
        answerKey: {
          correctChoiceId,
          type: "choice",
        },
        promptPayload: {
          choices,
          question: `What does ${seed.word} mean here?`,
          sentence: normalizeSentence(sentence),
          type: "meaning_in_context",
          word: seed.word,
        },
      },
    }),
  };
};

export const buildDeterministicRecognitionCardDraft = (
  seed: SeedDetail,
): ReviewCardDraft & {
  answerKey: Extract<
    ReviewAnswerKey,
    {
      type: "choice";
    }
  >;
  promptPayload: Extract<
    ReviewCardPromptPayload,
    {
      type: "recognition_in_fresh_sentence";
    }
  >;
} => {
  const payload = seed.enrichment?.payload;

  if (!payload) {
    throw new Error("Recognition card requires an enrichment payload.");
  }

  const sentence = normalizeSentence(
    `In the meeting, the ${seed.word} explanation helped everyone follow the decision.`,
  );
  const correctChoice = stripContextualLead(payload.gloss);
  const distractors = dedupeStrings([
    payload.contrastiveWord
      ? `It suggests something more like ${payload.contrastiveWord.word}.`
      : "",
    "It names a person rather than a quality of language or thought.",
    "It points to emotion without clarifying the meaning in context.",
  ]).slice(0, 2);
  const choices = rotateChoices(
    [correctChoice, ...distractors].map((label, index) => ({
      id: createChoiceId(index),
      label: ensureTerminalPunctuation(toSentenceCase(label)),
    })),
    seed.word,
  );
  const correctChoiceId =
    choices.find((choice) => normalizeWord(choice.label) === normalizeWord(ensureTerminalPunctuation(toSentenceCase(correctChoice))))?.id ??
    choices[0]?.id ??
    "choice_1";

  return {
    answerKey: {
      correctChoiceId,
      type: "choice",
    },
    dimension: "recognition",
    exerciseType: "recognition_in_fresh_sentence",
    generationSource: "template",
    model: null,
    promptPayload: {
      choices,
      question: `What does ${seed.word} suggest in this new sentence?`,
      sentence,
      type: "recognition_in_fresh_sentence",
      word: seed.word,
    },
    promptTemplateVersion: reviewCardPromptTemplateVersion,
    provider: null,
    schemaVersion: reviewCardPromptPayloadSchemaVersion,
    seedId: seed.id,
    trace: createAcceptedTraceDraft({
      outputRedacted: {
        answerKey: {
          correctChoiceId,
          type: "choice",
        },
        promptPayload: {
          choices,
          question: `What does ${seed.word} suggest in this new sentence?`,
          sentence,
          type: "recognition_in_fresh_sentence",
          word: seed.word,
        },
      },
    }),
  };
};

export const buildDeterministicClozeRecallCardDraft = (
  seed: SeedDetail,
): ReviewCardDraft & {
  answerKey: Extract<
    ReviewAnswerKey,
    {
      type: "text";
    }
  >;
  promptPayload: Extract<
    ReviewCardPromptPayload,
    {
      type: "cloze_recall";
    }
  >;
} => {
  const payload = seed.enrichment?.payload;

  if (!payload) {
    throw new Error("Cloze recall card requires an enrichment payload.");
  }

  const sentenceTemplates = [
    "The most fitting word in the margin was ____.",
    "In her notebook, the clearest single word was ____.",
    "One exact word carried the meaning here: ____.",
  ] as const;
  const sentence = normalizeSentence(
    sentenceTemplates[normalizeWord(seed.word).length % sentenceTemplates.length] ??
      sentenceTemplates[0],
  );
  const promptPayload = {
    question: "Type the saved word that best completes the blank.",
    sentence,
    type: "cloze_recall" as const,
  };
  const promptIssues = getClozePromptIssues({
    capturedSentence: seed.primarySentence ?? seed.contexts[0]?.text ?? null,
    promptPayload,
    word: seed.word,
  });

  if (promptIssues.length > 0) {
    throw new Error(promptIssues.join(" "));
  }

  return {
    answerKey: {
      acceptableAnswers: [seed.word],
      canonicalAnswer: seed.word,
      type: "text",
    },
    dimension: "recognition",
    exerciseType: "cloze_recall",
    generationSource: "template",
    model: null,
    promptPayload,
    promptTemplateVersion: reviewCardPromptTemplateVersion,
    provider: null,
    schemaVersion: reviewCardPromptPayloadSchemaVersion,
    seedId: seed.id,
    trace: createAcceptedTraceDraft({
      outputRedacted: {
        answerKey: {
          acceptableAnswers: [seed.word],
          canonicalAnswer: seed.word,
          type: "text",
        },
        promptPayload,
      },
    }),
  };
};

export const validateClozePrompt = (input: {
  capturedSentence?: string | null;
  promptPayload: Extract<
    ReviewCardPromptPayload,
    {
      type: "cloze_recall";
    }
  >;
  word: string;
}): void => {
  const issues = getClozePromptIssues(input);

  if (issues.length > 0) {
    throw new Error(issues.join(" "));
  }
};

export const validateRecognitionPrompt = (input: {
  capturedSentence?: string | null;
  promptPayload: Extract<
    ReviewCardPromptPayload,
    {
      type: "recognition_in_fresh_sentence";
    }
  >;
}): void => {
  const issues = getRecognitionPromptIssues(input);

  if (issues.length > 0) {
    throw new Error(issues.join(" "));
  }
};

export const buildContrastiveChoiceCardDraft = (
  seed: SeedDetail,
): ReviewCardDraft => {
  const contrastiveWord = seed.enrichment?.payload?.contrastiveWord?.word;

  if (!contrastiveWord) {
    throw new Error("Contrastive card requires a contrastive word.");
  }

  const sentence = normalizeSentence(
    (seed.primarySentence ?? `${seed.word} belongs in the blank.`).replace(
      new RegExp(escapeRegExp(seed.word), "iu"),
      "____",
    ),
  );
  const choices = rotateChoices(
    [
      {
        id: "choice_1",
        label: seed.word,
      },
      {
        id: "choice_2",
        label: contrastiveWord,
      },
    ],
    seed.word,
  );
  const correctChoiceId =
    choices.find((choice) => normalizeWord(choice.label) === normalizeWord(seed.word))
      ?.id ?? "choice_1";

  return {
    answerKey: {
      correctChoiceId,
      type: "choice",
    },
    dimension: "distinction",
    exerciseType: "contrastive_choice",
    generationSource: "template",
    model: null,
    promptPayload: {
      choices,
      question: "Which word fits this sentence better?",
      sentence,
      type: "contrastive_choice",
      word: seed.word,
    },
    promptTemplateVersion: reviewCardPromptTemplateVersion,
    provider: null,
    schemaVersion: reviewCardPromptPayloadSchemaVersion,
    seedId: seed.id,
    trace: createAcceptedTraceDraft({
      outputRedacted: {
        answerKey: {
          correctChoiceId,
          type: "choice",
        },
        promptPayload: {
          choices,
          question: "Which word fits this sentence better?",
          sentence,
          type: "contrastive_choice",
          word: seed.word,
        },
      },
    }),
  };
};

export const buildRegisterJudgmentCardDraft = (
  seed: SeedDetail,
): ReviewCardDraft => {
  const payload = seed.enrichment?.payload;

  if (!payload?.registerNote) {
    throw new Error("Register card requires a register note.");
  }

  const choices = rotateChoices(
    [
      {
        detail: `The lecture notes called the explanation ${seed.word} and unusually precise.`,
        id: "choice_1",
        label: "Sentence A",
      },
      {
        detail: `That group chat was totally ${seed.word}, lol.`,
        id: "choice_2",
        label: "Sentence B",
      },
    ],
    seed.word,
  );
  const offRegisterLabel = `That group chat was totally ${seed.word}, lol.`;
  const correctChoiceId =
    choices.find((choice) => choice.detail === offRegisterLabel)?.id ??
    "choice_2";

  return {
    answerKey: {
      correctChoiceId,
      type: "choice",
    },
    dimension: "usage",
    exerciseType: "register_judgment",
    generationSource: "template",
    model: null,
    promptPayload: {
      choices,
      question: "Which sentence feels less natural in tone?",
      type: "register_judgment",
      word: seed.word,
    },
    promptTemplateVersion: reviewCardPromptTemplateVersion,
    provider: null,
    schemaVersion: reviewCardPromptPayloadSchemaVersion,
    seedId: seed.id,
    trace: createAcceptedTraceDraft({
      outputRedacted: {
        answerKey: {
          correctChoiceId,
          type: "choice",
        },
        promptPayload: {
          choices,
          question: "Which sentence feels less natural in tone?",
          type: "register_judgment",
          word: seed.word,
        },
      },
    }),
  };
};

const getSuccessfulIntervalMs = (score: number): number => {
  switch (score) {
    case 0:
      return 24 * 60 * 60 * 1000;
    case 1:
      return 3 * 24 * 60 * 60 * 1000;
    case 2:
      return 7 * 24 * 60 * 60 * 1000;
    default:
      return 14 * 24 * 60 * 60 * 1000;
  }
};

const getFailedIntervalMs = (outcome: Exclude<ReviewOutcome, "correct">): number => {
  switch (outcome) {
    case "skipped":
      return 60 * 60 * 1000;
    case "partial":
      return 12 * 60 * 60 * 1000;
    case "incorrect":
    default:
      return 4 * 60 * 60 * 1000;
  }
};

export const gradeReviewSubmission = (input: {
  answerKey: ReviewAnswerKey;
  submission: ReviewSubmissionInput;
}): {
  correct: boolean;
  outcome: ReviewOutcome;
} => {
  if (input.answerKey.type !== input.submission.type) {
    throw new Error("Review submission type does not match the current card.");
  }

  if (input.answerKey.type === "choice" && input.submission.type === "choice") {
    return {
      correct: input.submission.choiceId === input.answerKey.correctChoiceId,
      outcome:
        input.submission.choiceId === input.answerKey.correctChoiceId
          ? "correct"
          : "incorrect",
    };
  }

  if (input.answerKey.type === "text" && input.submission.type === "text") {
    const normalizedSubmission = normalizeRecallAnswer(input.submission.text);
    const acceptedAnswers = input.answerKey.acceptableAnswers.map(
      normalizeRecallAnswer,
    );

    return {
      correct: acceptedAnswers.includes(normalizedSubmission),
      outcome: acceptedAnswers.includes(normalizedSubmission)
        ? "correct"
        : "incorrect",
    };
  }

  return {
    correct: false,
    outcome: "incorrect",
  };
};

export const applyReviewOutcomeToState = (input: {
  answerKey: ReviewAnswerKey;
  currentState: ReviewStateRow | null;
  dimension: ReviewDimension;
  now: Date;
  sessionId: string;
  submission: ReviewSubmissionInput;
  seedId: string;
  stateId: string;
}): {
  nextState: {
    distinctionDueAt: Date;
    distinctionScore: number;
    id: string;
    lastReviewedAt: Date;
    lastSessionId: string;
    recognitionDueAt: Date;
    recognitionScore: number;
    schedulerVersion: string;
    seedId: string;
    usageDueAt: Date;
    usageScore: number;
  };
  outcome: {
    correct: boolean;
    outcome: ReviewOutcome;
  };
  stateDelta: {
    nextDueAt: string;
    nextScore: number;
    previousDueAt: string;
    previousScore: number;
  };
} => {
  const outcome = gradeReviewSubmission({
    answerKey: input.answerKey,
    submission: input.submission,
  });
  const previousSnapshot = getDimensionSnapshot(input.currentState, input.dimension);
  const nextScore = outcome.correct
    ? Math.min(previousSnapshot.score + 1, 3)
    : Math.max(previousSnapshot.score - 1, 0);
  const intervalMs = outcome.correct
    ? getSuccessfulIntervalMs(nextScore)
    : getFailedIntervalMs(outcome.outcome === "correct" ? "incorrect" : outcome.outcome);
  const nextDueAt = new Date(
    input.now.getTime() + intervalMs,
  );

  return {
    nextState: setDimensionSnapshot(
      input.currentState,
      input.dimension,
      {
        dueAt: nextDueAt,
        score: nextScore,
      },
      input.sessionId,
      input.now,
      input.seedId,
      input.stateId,
    ),
    outcome,
    stateDelta: {
      nextDueAt: nextDueAt.toISOString(),
      nextScore,
      previousDueAt: previousSnapshot.dueAt.toISOString(),
      previousScore: previousSnapshot.score,
    },
  };
};

export const deriveSeedStageFromReviewState = (input: {
  distinctionScore: number;
  recognitionScore: number;
  usageScore: number;
}): SeedStage => {
  if (
    input.recognitionScore >= 2 &&
    input.distinctionScore >= 2 &&
    input.usageScore >= 2
  ) {
    return "mature";
  }

  if (input.distinctionScore >= 1 || input.usageScore >= 1) {
    return "deepening";
  }

  if (input.recognitionScore >= 1) {
    return "stabilizing";
  }

  return "new";
};

export const toReviewState = (row: ReviewStateRow): ReviewState =>
  reviewStateSchema.parse({
    createdAt: row.createdAt.toISOString(),
    distinction: {
      dueAt: row.distinctionDueAt.toISOString(),
      score: row.distinctionScore,
    },
    id: row.id,
    lastReviewedAt: row.lastReviewedAt?.toISOString() ?? null,
    lastSessionId: row.lastSessionId ?? null,
    recognition: {
      dueAt: row.recognitionDueAt.toISOString(),
      score: row.recognitionScore,
    },
    schedulerVersion: row.schedulerVersion,
    seedId: row.seedId,
    updatedAt: row.updatedAt.toISOString(),
    usage: {
      dueAt: row.usageDueAt.toISOString(),
      score: row.usageScore,
    },
  });

export const toReviewCard = (row: ReviewCardRow): ReviewCard =>
  reviewCardSchema.parse({
    dimension: row.dimension,
    exerciseType: row.exerciseType,
    generationSource: row.generationSource,
    id: row.id,
    position: row.position,
    promptPayload: row.promptPayload,
    seedId: row.seedId,
    status: row.status,
  });

export const getCurrentCardId = (cards: readonly ReviewCardRow[]): string | null =>
  cards
    .find((card) => card.status === "pending")
    ?.id ?? null;

export const toReviewSessionSummary = (input: {
  cards: readonly ReviewCardRow[];
  session: ReviewSessionRow;
}): ReviewSessionDetail["session"] =>
  reviewSessionSummarySchema.parse({
    cardCount: input.session.cardCount,
    completedAt: input.session.completedAt?.toISOString() ?? null,
    currentCardId: getCurrentCardId(input.cards),
    id: input.session.id,
    remainingCount: input.cards.filter((card) => card.status === "pending").length,
    startedAt: input.session.startedAt.toISOString(),
    status: input.session.status,
  });

export const toReviewSessionDetail = (input: {
  cards: readonly ReviewCardRow[];
  session: ReviewSessionRow;
}): ReviewSessionDetail =>
  reviewSessionDetailSchema.parse({
    cards: input.cards
      .slice()
      .sort((left, right) => left.position - right.position)
      .map(toReviewCard),
    session: toReviewSessionSummary(input),
  });

export const toReviewQueueSummary = (input: {
  activeSessionId: string | null;
  availableCount: number;
  capturedCount: number;
  dueByDimension: Record<ReviewDimension, number>;
  dueCount: number;
}): ReviewQueueSummary =>
  reviewQueueSummarySchema.parse({
    activeSessionId: input.activeSessionId,
    availableCount: input.availableCount,
    capturedCount: input.capturedCount,
    dueByDimension: input.dueByDimension,
    dueCount: input.dueCount,
  });

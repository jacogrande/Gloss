import type {
  ApiErrorCode,
  CreateSeedInput,
  ListSeedsData,
  ListSeedsQuery,
  Profile,
  ReviewCard,
  ReviewCardPromptPayload,
  ReviewCardStatus,
  ReviewDimension,
  ReviewExerciseType,
  ReviewGenerationSource,
  ReviewOutcome,
  ReviewQueueSummary,
  ReviewSessionDetail,
  ReviewSessionStatus,
  ReviewSubmissionInput,
  ReviewSubmissionResult,
  SeedContext,
  SeedContextKind,
  SeedDetail,
  SeedEnrichment,
  SeedEnrichmentGuardrailFlag,
  SeedEnrichmentMorphology,
  SeedEnrichmentPayload,
  SeedEnrichmentRelation,
  SeedEnrichmentStatus,
  SeedStage,
  SeedSummary,
  SessionData,
  SessionRecord,
  SessionUser,
  SourceKind,
  SourceSummary,
} from "@gloss/shared/types";
import {
  apiErrorCodeValues,
  reviewCardStatusValues as reviewCardStatusValueList,
  reviewDimensionValues as reviewDimensionValueList,
  reviewExerciseTypeValues as reviewExerciseTypeValueList,
  reviewGenerationSourceValues as reviewGenerationSourceValueList,
  reviewOutcomeValues as reviewOutcomeValueList,
  reviewSessionStatusValues as reviewSessionStatusValueList,
  seedContextKindValues,
  seedEnrichmentGuardrailFlagValues,
  seedEnrichmentStatusValues,
  seedStageValues,
  sourceKindValues,
} from "@gloss/shared/values";

type JsonRecord = Record<string, unknown>;
type ReviewChoice = Extract<
  ReviewCardPromptPayload,
  {
    type: "meaning_in_context";
  }
>["choices"][number];

const seedStageValueSet = new Set<SeedStage>(seedStageValues);
const sourceKindValueSet = new Set<SourceKind>(sourceKindValues);
const seedContextKindValueSet = new Set<SeedContextKind>(seedContextKindValues);
const seedEnrichmentStatusValueSet = new Set<SeedEnrichmentStatus>(
  seedEnrichmentStatusValues,
);
const seedEnrichmentGuardrailValueSet = new Set<SeedEnrichmentGuardrailFlag>(
  seedEnrichmentGuardrailFlagValues,
);
const apiErrorCodeValueSet = new Set<ApiErrorCode>(apiErrorCodeValues);
const reviewDimensionValueSet = new Set<ReviewDimension>(reviewDimensionValueList);
const reviewExerciseTypeValueSet = new Set<ReviewExerciseType>(
  reviewExerciseTypeValueList,
);
const reviewCardStatusValueSet = new Set<ReviewCardStatus>(
  reviewCardStatusValueList,
);
const reviewGenerationSourceValueSet = new Set<ReviewGenerationSource>(
  reviewGenerationSourceValueList,
);
const reviewSessionStatusValueSet = new Set<ReviewSessionStatus>(
  reviewSessionStatusValueList,
);
const reviewOutcomeValueSet = new Set<ReviewOutcome>(reviewOutcomeValueList);
const reviewSubmissionTypeValueSet = new Set(["choice", "text"] as const);

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null;

const readRecord = (value: unknown): JsonRecord => {
  if (!isRecord(value)) {
    throw new Error("Expected object.");
  }

  return value;
};

const readString = (value: unknown): string => {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Expected string.");
  }

  return value;
};

const readNullableString = (value: unknown): string | null => {
  if (value === null) {
    return null;
  }

  return readString(value);
};

const readRecallAnswer = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new Error("Expected string.");
  }

  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed.length > 160) {
    throw new Error("Expected valid recall answer.");
  }

  return trimmed;
};

const readClozeSentence = (value: unknown): string => {
  const sentence = readString(value);

  if (!sentence.includes("____")) {
    throw new Error("Expected cloze sentence to include a blank.");
  }

  return sentence;
};

const readBoolean = (value: unknown): boolean => {
  if (typeof value !== "boolean") {
    throw new Error("Expected boolean.");
  }

  return value;
};

const readNonNegativeInteger = (value: unknown): number => {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error("Expected non-negative integer.");
  }

  return value as number;
};

const readArray = (value: unknown): unknown[] => {
  if (!Array.isArray(value)) {
    throw new Error("Expected array.");
  }

  return value;
};

const readEnum = <TValue extends string>(
  value: unknown,
  values: Set<TValue>,
): TValue => {
  if (typeof value !== "string" || !values.has(value as TValue)) {
    throw new Error("Expected enum value.");
  }

  return value as TValue;
};

const parseApiSuccess = <TData>(
  value: unknown,
  parseData: (data: unknown) => TData,
): TData => {
  const record = readRecord(value);

  if (record.ok !== true) {
    throw new Error("Expected success envelope.");
  }

  return parseData(record.data);
};

const parseSessionUser = (value: unknown): SessionUser => {
  const record = readRecord(value);

  return {
    email: readString(record.email),
    id: readString(record.id),
    image: readNullableString(record.image),
    name: readString(record.name),
  };
};

const parseSessionRecord = (value: unknown): SessionRecord => {
  const record = readRecord(value);

  return {
    expiresAt: readString(record.expiresAt),
    id: readString(record.id),
    userId: readString(record.userId),
  };
};

const parseProfile = (value: unknown): Profile => {
  const record = readRecord(value);

  return {
    createdAt: readString(record.createdAt),
    updatedAt: readString(record.updatedAt),
    userId: readString(record.userId),
  };
};

const parseSourceSummary = (value: unknown): SourceSummary => {
  const record = readRecord(value);

  return {
    author: readNullableString(record.author),
    id: readString(record.id),
    kind: readEnum(record.kind, sourceKindValueSet),
    title: readNullableString(record.title),
    url: readNullableString(record.url),
  };
};

const parseSeedContext = (value: unknown): SeedContext => {
  const record = readRecord(value);

  return {
    createdAt: readString(record.createdAt),
    id: readString(record.id),
    isPrimary: readBoolean(record.isPrimary),
    kind: readEnum(record.kind, seedContextKindValueSet),
    text: readString(record.text),
  };
};

const parseSeedEnrichmentRelation = (
  value: unknown,
): SeedEnrichmentRelation => {
  const record = readRecord(value);

  return {
    note: readString(record.note),
    word: readString(record.word),
  };
};

const parseSeedEnrichmentMorphology = (
  value: unknown,
): SeedEnrichmentMorphology => {
  const record = readRecord(value);

  return {
    note: readString(record.note),
  };
};

const parseSeedEnrichmentPayload = (
  value: unknown,
): SeedEnrichmentPayload => {
  const record = readRecord(value);

  return {
    ...(record.contrastiveWord
      ? { contrastiveWord: parseSeedEnrichmentRelation(record.contrastiveWord) }
      : {}),
    gloss: readString(record.gloss),
    ...(record.morphologyNote
      ? { morphologyNote: parseSeedEnrichmentMorphology(record.morphologyNote) }
      : {}),
    ...(typeof record.registerNote === "string"
      ? { registerNote: readString(record.registerNote) }
      : {}),
    ...(record.relatedWord
      ? { relatedWord: parseSeedEnrichmentRelation(record.relatedWord) }
      : {}),
  };
};

const parseSeedEnrichment = (value: unknown): SeedEnrichment => {
  const record = readRecord(value);

  return {
    completedAt: readNullableString(record.completedAt),
    createdAt: readString(record.createdAt),
    errorCode:
      record.errorCode === null
        ? null
        : readEnum(record.errorCode, apiErrorCodeValueSet),
    failedAt: readNullableString(record.failedAt),
    guardrailFlags: readArray(record.guardrailFlags).map((item) =>
      readEnum(item, seedEnrichmentGuardrailValueSet),
    ),
    id: readString(record.id),
    model: readNullableString(record.model),
    payload:
      record.payload === null ? null : parseSeedEnrichmentPayload(record.payload),
    promptTemplateVersion: readString(record.promptTemplateVersion),
    provider: readNullableString(record.provider),
    requestedAt: readString(record.requestedAt),
    schemaVersion: readString(record.schemaVersion),
    startedAt: readNullableString(record.startedAt),
    status: readEnum(record.status, seedEnrichmentStatusValueSet),
    updatedAt: readString(record.updatedAt),
  };
};

const parseSeedSummary = (value: unknown): SeedSummary => {
  const record = readRecord(value);

  return {
    createdAt: readString(record.createdAt),
    id: readString(record.id),
    primarySentence: readNullableString(record.primarySentence),
    source: record.source === null ? null : parseSourceSummary(record.source),
    stage: readEnum(record.stage, seedStageValueSet),
    updatedAt: readString(record.updatedAt),
    word: readString(record.word),
  };
};

const parseSeedDetail = (value: unknown): SeedDetail => {
  const record = readRecord(value);
  const summary = parseSeedSummary(record);

  return {
    ...summary,
    contexts: readArray(record.contexts).map(parseSeedContext),
    enrichment:
      record.enrichment === null ? null : parseSeedEnrichment(record.enrichment),
  };
};

const parseReviewChoice = (
  value: unknown,
): ReviewChoice => {
  const record = readRecord(value);

  return {
    ...(typeof record.detail === "string"
      ? {
          detail: readString(record.detail),
        }
      : {}),
    id: readString(record.id),
    label: readString(record.label),
  };
};

const parseReviewCardPromptPayload = (
  value: unknown,
): ReviewCardPromptPayload => {
  const record = readRecord(value);
  const type = readEnum(record.type, reviewExerciseTypeValueSet);

  switch (type) {
    case "meaning_in_context":
      return {
        choices: readArray(record.choices).map(parseReviewChoice),
        question: readString(record.question),
        sentence: readString(record.sentence),
        type,
        word: readString(record.word),
      };
    case "recognition_in_fresh_sentence":
      return {
        choices: readArray(record.choices).map(parseReviewChoice),
        question: readString(record.question),
        sentence: readString(record.sentence),
        type,
        word: readString(record.word),
      };
    case "cloze_recall":
      return {
        question: readString(record.question),
        sentence: readClozeSentence(record.sentence),
        type,
      };
    case "contrastive_choice":
      return {
        choices: readArray(record.choices).map(parseReviewChoice),
        question: readString(record.question),
        sentence: readString(record.sentence),
        type,
        word: readString(record.word),
      };
    case "register_judgment":
      return {
        choices: readArray(record.choices).map(parseReviewChoice),
        question: readString(record.question),
        type,
        word: readString(record.word),
      };
    default:
      throw new Error("Unknown review card payload.");
  }
};

const parseReviewCard = (value: unknown): ReviewCard => {
  const record = readRecord(value);

  return {
    dimension: readEnum(record.dimension, reviewDimensionValueSet),
    exerciseType: readEnum(record.exerciseType, reviewExerciseTypeValueSet),
    generationSource: readEnum(
      record.generationSource,
      reviewGenerationSourceValueSet,
    ),
    id: readString(record.id),
    position: readNonNegativeInteger(record.position),
    promptPayload: parseReviewCardPromptPayload(record.promptPayload),
    seedId: readString(record.seedId),
    status: readEnum(record.status, reviewCardStatusValueSet),
  };
};

const parseReviewSessionDetail = (value: unknown): ReviewSessionDetail => {
  const record = readRecord(value);
  const session = readRecord(record.session);

  return {
    cards: readArray(record.cards).map(parseReviewCard),
    session: {
      cardCount: readNonNegativeInteger(session.cardCount),
      completedAt: readNullableString(session.completedAt),
      currentCardId: readNullableString(session.currentCardId),
      id: readString(session.id),
      remainingCount: readNonNegativeInteger(session.remainingCount),
      startedAt: readString(session.startedAt),
      status: readEnum(session.status, reviewSessionStatusValueSet),
    },
  };
};

export const parseWebEnv = (value: unknown): {
  MODE: string;
  VITE_API_BASE_URL: string;
} => {
  const record = readRecord(value);

  return {
    MODE: readString(record.MODE),
    VITE_API_BASE_URL: readString(record.VITE_API_BASE_URL),
  };
};

export const parseSessionResponse = (value: unknown): SessionData =>
  parseApiSuccess(value, (data) => {
    const record = readRecord(data);

    return {
      profile: record.profile === null ? null : parseProfile(record.profile),
      session: parseSessionRecord(record.session),
      user: parseSessionUser(record.user),
    };
  });

export const parseCreateSeedResponse = (value: unknown): SeedDetail =>
  parseApiSuccess(value, parseSeedDetail);

export const parseSeedListResponse = (value: unknown): ListSeedsData =>
  parseApiSuccess(value, (data) => {
    const record = readRecord(data);

    return {
      items: readArray(record.items).map(parseSeedSummary),
      total: readNonNegativeInteger(record.total),
    };
  });

export const parseSeedDetailResponse = (value: unknown): SeedDetail =>
  parseApiSuccess(value, parseSeedDetail);

export const parseUpdateSeedResponse = (value: unknown): SeedDetail =>
  parseApiSuccess(value, parseSeedDetail);

export const parseSeedEnrichmentResponse = (value: unknown): SeedEnrichment =>
  parseApiSuccess(value, parseSeedEnrichment);

export const parseReviewQueueResponse = (value: unknown): ReviewQueueSummary =>
  parseApiSuccess(value, (data) => {
    const record = readRecord(data);
    const dueByDimension = readRecord(record.dueByDimension);

    return {
      activeSessionId: readNullableString(record.activeSessionId),
      availableCount: readNonNegativeInteger(record.availableCount),
      capturedCount: readNonNegativeInteger(record.capturedCount),
      dueByDimension: {
        distinction: readNonNegativeInteger(dueByDimension.distinction),
        recognition: readNonNegativeInteger(dueByDimension.recognition),
        usage: readNonNegativeInteger(dueByDimension.usage),
      },
      dueCount: readNonNegativeInteger(record.dueCount),
    };
  });

export const parseReviewSessionResponse = (
  value: unknown,
): ReviewSessionDetail => parseApiSuccess(value, parseReviewSessionDetail);

export const parseSubmitReviewCardResponse = (
  value: unknown,
): {
  result: ReviewSubmissionResult;
  session: ReviewSessionDetail;
} =>
  parseApiSuccess(value, (data) => {
    const record = readRecord(data);
    const result = readRecord(record.result);
    const submissionType = readEnum(
      result.submissionType,
      reviewSubmissionTypeValueSet,
    );

    return {
      result:
        submissionType === "choice"
          ? {
              cardId: readString(result.cardId),
              correct: readBoolean(result.correct),
              correctChoiceId: readString(result.correctChoiceId),
              outcome: readEnum(result.outcome, reviewOutcomeValueSet),
              seedStage: readEnum(result.seedStage, seedStageValueSet),
              submissionType,
            }
          : {
              cardId: readString(result.cardId),
              correct: readBoolean(result.correct),
              expectedText: readRecallAnswer(result.expectedText),
              outcome: readEnum(result.outcome, reviewOutcomeValueSet),
              seedStage: readEnum(result.seedStage, seedStageValueSet),
              submissionType,
            },
      session: parseReviewSessionDetail(record.session),
    };
  });

export const parseListSeedsQuery = (value: ListSeedsQuery): ListSeedsQuery => {
  if (!value.stage) {
    return {};
  }

  return {
    stage: readEnum(value.stage, seedStageValueSet),
  };
};

export const parseCreateSeedInput = (value: CreateSeedInput): CreateSeedInput => {
  const record = readRecord(value);
  const rawWord = record.word;

  if (typeof rawWord !== "string") {
    throw new Error("Enter a word or phrase.");
  }

  const word = rawWord.trim();

  if (word.length === 0) {
    throw new Error("Enter a word or phrase.");
  }

  if (word.length > 160) {
    throw new Error("Word is too long.");
  }

  return {
    ...value,
    word,
  };
};

export const parseReviewSubmissionInput = (
  value: ReviewSubmissionInput,
): ReviewSubmissionInput =>
  value.type === "choice"
    ? {
        ...(typeof value.latencyMs === "number"
          ? {
              latencyMs: readNonNegativeInteger(value.latencyMs),
            }
          : {}),
        choiceId: readString(value.choiceId),
        type: "choice",
      }
    : {
        ...(typeof value.latencyMs === "number"
          ? {
              latencyMs: readNonNegativeInteger(value.latencyMs),
            }
          : {}),
        text: readRecallAnswer(value.text),
        type: "text",
      };

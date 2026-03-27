import type {
  ApiErrorCode,
  CreateSeedInput,
  ListSeedsData,
  ListSeedsQuery,
  Profile,
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

type JsonRecord = Record<string, unknown>;

const seedStageValues = new Set<SeedStage>([
  "new",
  "stabilizing",
  "deepening",
  "mature",
]);

const sourceKindValues = new Set<SourceKind>([
  "manual",
  "article",
  "book",
  "other",
]);

const seedContextKindValues = new Set<SeedContextKind>(["sentence"]);

const seedEnrichmentStatusValues = new Set<SeedEnrichmentStatus>([
  "pending",
  "ready",
  "failed",
]);

const seedEnrichmentGuardrailValues = new Set<SeedEnrichmentGuardrailFlag>([
  "contrast_omitted_weak_evidence",
  "morphology_omitted_weak_evidence",
  "register_omitted_weak_evidence",
  "related_omitted_weak_evidence",
]);

const apiErrorCodeValues = new Set<ApiErrorCode>([
  "AUTH_UNAUTHORIZED",
  "CONFLICT",
  "ENRICHMENT_CONFLICT",
  "ENRICHMENT_EVIDENCE_UNAVAILABLE",
  "ENRICHMENT_PROVIDER_ERROR",
  "ENRICHMENT_SCHEMA_INVALID",
  "INTERNAL_ERROR",
  "NOT_FOUND",
  "VALIDATION_ERROR",
]);

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
    kind: readEnum(record.kind, sourceKindValues),
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
    kind: readEnum(record.kind, seedContextKindValues),
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
        : readEnum(record.errorCode, apiErrorCodeValues),
    failedAt: readNullableString(record.failedAt),
    guardrailFlags: readArray(record.guardrailFlags).map((item) =>
      readEnum(item, seedEnrichmentGuardrailValues),
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
    status: readEnum(record.status, seedEnrichmentStatusValues),
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
    stage: readEnum(record.stage, seedStageValues),
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

export const parseSeedEnrichmentResponse = (value: unknown): SeedEnrichment =>
  parseApiSuccess(value, parseSeedEnrichment);

export const parseListSeedsQuery = (value: ListSeedsQuery): ListSeedsQuery => {
  if (!value.stage) {
    return {};
  }

  return {
    stage: readEnum(value.stage, seedStageValues),
  };
};

export const parseCreateSeedInput = (value: CreateSeedInput): CreateSeedInput => {
  const record = readRecord(value);
  const word = readString(record.word);

  if (word.length > 160) {
    throw new Error("Word is too long.");
  }

  return value;
};

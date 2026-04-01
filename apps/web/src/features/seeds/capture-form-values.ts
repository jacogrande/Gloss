import type {
  CreateSeedInput,
  SeedDetail,
  SourceKind,
  UpdateSeedInput,
} from "@gloss/shared/types";

export type CaptureFormValues = {
  sentence: string;
  sourceAuthor: string;
  sourceKind: SourceKind;
  sourceTitle: string;
  sourceUrl: string;
  word: string;
};

export type SeedContextFormValues = Omit<CaptureFormValues, "word">;
export type SeedContextSeedSnapshot = Pick<SeedDetail, "primarySentence" | "source">;

const toOptionalTrimmedValue = (value: string): string | undefined => {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
};

const toOptionalSourceInput = (
  values: SeedContextFormValues,
): CreateSeedInput["source"] => {
  const sourceAuthor = toOptionalTrimmedValue(values.sourceAuthor);
  const sourceTitle = toOptionalTrimmedValue(values.sourceTitle);
  const sourceUrl = toOptionalTrimmedValue(values.sourceUrl);

  return sourceAuthor || sourceTitle || sourceUrl
    ? {
        author: sourceAuthor,
        kind: values.sourceKind,
        title: sourceTitle,
        url: sourceUrl,
      }
    : undefined;
};

export const toCreateSeedInput = (
  values: CaptureFormValues,
): CreateSeedInput => {
  const sentence = toOptionalTrimmedValue(values.sentence);
  const source = toOptionalSourceInput(values);

  return {
    sentence,
    source,
    word: values.word.trim(),
  };
};

const toComparableSourceInput = (
  seed: SeedContextSeedSnapshot,
): CreateSeedInput["source"] =>
  seed.source
    ? {
        author: seed.source.author ?? undefined,
        kind: seed.source.kind,
        title: seed.source.title ?? undefined,
        url: seed.source.url ?? undefined,
      }
    : undefined;

const areSourceInputsEqual = (
  left: CreateSeedInput["source"],
  right: CreateSeedInput["source"],
): boolean =>
  left?.author === right?.author &&
  left?.kind === right?.kind &&
  left?.title === right?.title &&
  left?.url === right?.url;

export const hasSeedContextChanges = (
  values: SeedContextFormValues,
  seed: SeedContextSeedSnapshot,
): boolean => {
  const sentence = toOptionalTrimmedValue(values.sentence);
  const source = toOptionalSourceInput(values);
  const existingSentence = seed.primarySentence?.trim() || undefined;
  const existingSource = toComparableSourceInput(seed);

  return sentence !== existingSentence || !areSourceInputsEqual(source, existingSource);
};

export const toUpdateSeedInput = (
  values: SeedContextFormValues,
  seed: SeedContextSeedSnapshot,
): UpdateSeedInput => {
  const sentence = toOptionalTrimmedValue(values.sentence);
  const source = toOptionalSourceInput(values);
  const existingSentence = seed.primarySentence?.trim() || undefined;
  const existingSource = toComparableSourceInput(seed);

  return {
    ...(sentence !== existingSentence
      ? {
          sentence: sentence ?? null,
        }
      : {}),
    ...(!areSourceInputsEqual(source, existingSource)
      ? {
          source: source ?? null,
        }
      : {}),
  };
};

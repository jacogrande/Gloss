import type {
  CreateSeedInput,
  SourceKind,
} from "@gloss/shared/types";

export type CaptureFormValues = {
  sentence: string;
  sourceAuthor: string;
  sourceKind: SourceKind;
  sourceTitle: string;
  sourceUrl: string;
  word: string;
};

const toOptionalTrimmedValue = (value: string): string | undefined => {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
};

export const toCreateSeedInput = (
  values: CaptureFormValues,
): CreateSeedInput => {
  const sentence = toOptionalTrimmedValue(values.sentence);
  const sourceAuthor = toOptionalTrimmedValue(values.sourceAuthor);
  const sourceTitle = toOptionalTrimmedValue(values.sourceTitle);
  const sourceUrl = toOptionalTrimmedValue(values.sourceUrl);
  const source =
    sourceAuthor || sourceTitle || sourceUrl
      ? {
          author: sourceAuthor,
          kind: values.sourceKind,
          title: sourceTitle,
          url: sourceUrl,
        }
      : undefined;

  return {
    sentence,
    source,
    word: values.word.trim(),
  };
};

import {
  seedDetailSchema,
  seedSummarySchema,
  sourceSummarySchema,
} from "@gloss/shared/contracts";
import type {
  CreateSeedInput,
  SeedContext,
  SeedDetail,
  SeedSummary,
} from "@gloss/shared/types";

import type {
  SeedContextRow,
  SeedEnrichmentRow,
  SeedRow,
} from "../db/schema";
import { toSeedEnrichment } from "./enrichment-contracts";

export type NormalizedSourceInput = NonNullable<CreateSeedInput["source"]>;
export type SourceSummaryRecord = {
  author: string | null;
  id: string;
  kind: NonNullable<CreateSeedInput["source"]>["kind"];
  title: string | null;
  url: string | null;
};

const normalizeWhitespace = (value: string): string =>
  value.trim().replace(/\s+/g, " ");

export const normalizeWord = (value: string): string =>
  normalizeWhitespace(value).toLocaleLowerCase("en-US");

export const normalizeCaptureInput = (
  input: CreateSeedInput,
): CreateSeedInput => ({
  sentence: input.sentence ? normalizeWhitespace(input.sentence) : undefined,
  source: input.source
    ? {
        author: input.source.author
          ? normalizeWhitespace(input.source.author)
          : undefined,
        kind: input.source.kind,
        title: input.source.title
          ? normalizeWhitespace(input.source.title)
          : undefined,
        url: input.source.url,
      }
    : undefined,
  word: normalizeWhitespace(input.word),
});

export const toSourceSummary = (
  source: SourceSummaryRecord | null,
): ReturnType<typeof sourceSummarySchema.parse> | null => {
  if (!source) {
    return null;
  }

  return sourceSummarySchema.parse({
    author: source.author,
    id: source.id,
    kind: source.kind,
    title: source.title,
    url: source.url,
  });
};

export const toSeedContext = (context: SeedContextRow): SeedContext => ({
  createdAt: context.createdAt.toISOString(),
  id: context.id,
  isPrimary: context.isPrimary,
  kind: "sentence",
  text: context.text,
});

export const toSeedSummary = (input: {
  primaryContext: SeedContextRow | null;
  seed: SeedRow;
  source: SourceSummaryRecord | null;
}): SeedSummary =>
  seedSummarySchema.parse({
    createdAt: input.seed.createdAt.toISOString(),
    id: input.seed.id,
    primarySentence: input.primaryContext?.text ?? null,
    source: toSourceSummary(input.source),
    stage: input.seed.stage,
    updatedAt: input.seed.updatedAt.toISOString(),
    word: input.seed.word,
  });

export const toSeedDetail = (input: {
  contexts: SeedContextRow[];
  enrichment?: SeedEnrichmentRow | null;
  seed: SeedRow;
  source: SourceSummaryRecord | null;
}): SeedDetail => {
  const primaryContext =
    input.contexts.find((context) => context.isPrimary) ?? input.contexts[0] ?? null;

  return seedDetailSchema.parse({
    contexts: input.contexts.map(toSeedContext),
    createdAt: input.seed.createdAt.toISOString(),
    enrichment: input.enrichment ? toSeedEnrichment(input.enrichment) : null,
    id: input.seed.id,
    primarySentence: primaryContext?.text ?? null,
    source: toSourceSummary(input.source),
    stage: input.seed.stage,
    updatedAt: input.seed.updatedAt.toISOString(),
    word: input.seed.word,
  });
};

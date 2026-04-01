import { sourceKindValues } from "@gloss/shared/values";

import type { SourceKind } from "@gloss/shared/types";

import type { SeedContextFormValues } from "./capture-form-values";

type StorageLike = Pick<Storage, "getItem" | "removeItem" | "setItem">;

type SeedContextDraft = {
  isSourceOpen: boolean;
  values: SeedContextFormValues;
};

const storageKeyPrefix = "gloss.seed_context_draft";

const sourceKindSet = new Set<SourceKind>(sourceKindValues);

const resolveSessionStorage = (): StorageLike | null =>
  typeof window === "undefined" ? null : window.sessionStorage;

const getDraftKey = (seedId: string): string => `${storageKeyPrefix}:${seedId}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toSafeString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const toSafeSourceKind = (value: unknown): SourceKind =>
  typeof value === "string" && sourceKindSet.has(value as SourceKind)
    ? (value as SourceKind)
    : "article";

const sanitizeDraft = (value: unknown): SeedContextDraft | null => {
  if (!isRecord(value) || !isRecord(value.values)) {
    return null;
  }

  return {
    isSourceOpen: value.isSourceOpen === true,
    values: {
      sentence: toSafeString(value.values.sentence),
      sourceAuthor: toSafeString(value.values.sourceAuthor),
      sourceKind: toSafeSourceKind(value.values.sourceKind),
      sourceTitle: toSafeString(value.values.sourceTitle),
      sourceUrl: toSafeString(value.values.sourceUrl),
    },
  };
};

export const readSeedContextDraft = (
  seedId: string,
  storage: StorageLike | null = resolveSessionStorage(),
): SeedContextDraft | null => {
  const rawValue = storage?.getItem(getDraftKey(seedId));

  if (!rawValue) {
    return null;
  }

  try {
    return sanitizeDraft(JSON.parse(rawValue));
  } catch {
    return null;
  }
};

export const writeSeedContextDraft = (
  seedId: string,
  draft: SeedContextDraft,
  storage: StorageLike | null = resolveSessionStorage(),
): void => {
  storage?.setItem(getDraftKey(seedId), JSON.stringify(draft));
};

export const clearSeedContextDraft = (
  seedId: string,
  storage: StorageLike | null = resolveSessionStorage(),
): void => {
  storage?.removeItem(getDraftKey(seedId));
};

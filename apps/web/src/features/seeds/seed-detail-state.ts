import type {
  SeedDetail,
  SeedEnrichment,
} from "@gloss/shared/types";

const getSeedTimestamp = (
  seed: Pick<SeedDetail, "createdAt" | "updatedAt">,
): number => new Date(seed.updatedAt ?? seed.createdAt).getTime();

const getEnrichmentRank = (
  enrichment: SeedEnrichment | null | undefined,
): number => {
  switch (enrichment?.status) {
    case "ready":
      return 3;
    case "failed":
      return 2;
    case "pending":
      return 1;
    default:
      return 0;
  }
};

const getEnrichmentTimestamp = (
  enrichment: SeedEnrichment | null | undefined,
): number => {
  const candidate =
    enrichment?.updatedAt ??
    enrichment?.completedAt ??
    enrichment?.failedAt ??
    enrichment?.startedAt ??
    enrichment?.requestedAt ??
    enrichment?.createdAt;

  return candidate ? new Date(candidate).getTime() : Number.NEGATIVE_INFINITY;
};

const pickPreferredEnrichment = (
  current: SeedEnrichment | null | undefined,
  incoming: SeedEnrichment | null | undefined,
): SeedEnrichment | null => {
  if (!current) {
    return incoming ?? null;
  }

  if (!incoming) {
    return current;
  }

  const currentTimestamp = getEnrichmentTimestamp(current);
  const incomingTimestamp = getEnrichmentTimestamp(incoming);

  if (incomingTimestamp !== currentTimestamp) {
    return incomingTimestamp > currentTimestamp ? incoming : current;
  }

  return getEnrichmentRank(incoming) >= getEnrichmentRank(current)
    ? incoming
    : current;
};

export const mergeSeedDetailState = (
  current: SeedDetail,
  incoming: SeedDetail,
): SeedDetail => {
  if (current.id !== incoming.id) {
    return incoming;
  }

  const preferIncoming = getSeedTimestamp(incoming) >= getSeedTimestamp(current);
  const base = preferIncoming ? incoming : current;

  return {
    ...base,
    contexts: preferIncoming ? incoming.contexts : current.contexts,
    enrichment: pickPreferredEnrichment(current.enrichment, incoming.enrichment),
    primarySentence: preferIncoming
      ? incoming.primarySentence
      : current.primarySentence,
    source: preferIncoming ? incoming.source : current.source,
  };
};

import type {
  CreateSeedInput,
  ListSeedsQuery,
  ReviewQueueSummary,
  ReviewSessionDetail,
  ReviewSubmissionInput,
  ReviewSubmissionResult,
  SeedEnrichment,
  UpdateSeedInput,
} from "@gloss/shared/types";
import { requestJson } from "./http";
import {
  parseCreateSeedInput,
  parseCreateSeedResponse,
  parseListSeedsQuery,
  parseReviewQueueResponse,
  parseReviewSessionResponse,
  parseReviewSubmissionInput,
  parseSeedDetailResponse,
  parseSeedEnrichmentResponse,
  parseSeedListResponse,
  parseSessionResponse,
  parseSubmitReviewCardResponse,
  parseUpdateSeedResponse,
} from "./parsers";

export const fetchSessionSnapshot = async (
  apiBaseUrl: string,
  signal?: AbortSignal,
): Promise<import("@gloss/shared/types").SessionData> =>
  requestJson(
    signal
      ? {
          apiBaseUrl,
          parseData: parseSessionResponse,
          pathname: "/api/me",
          signal,
        }
      : {
          apiBaseUrl,
          parseData: parseSessionResponse,
          pathname: "/api/me",
        },
  );

export const createSeed = async (
  apiBaseUrl: string,
  input: CreateSeedInput,
): Promise<import("@gloss/shared/types").SeedDetail> =>
  requestJson({
    apiBaseUrl,
    body: parseCreateSeedInput(input),
    method: "POST",
    parseData: parseCreateSeedResponse,
    pathname: "/capture/seeds",
  });

export const fetchSeedList = async (
  apiBaseUrl: string,
  query: ListSeedsQuery,
  signal?: AbortSignal,
): Promise<import("@gloss/shared/types").ListSeedsData> => {
  const parsedQuery = parseListSeedsQuery(query);

  return requestJson(
    signal
      ? {
          apiBaseUrl,
          parseData: parseSeedListResponse,
          pathname: "/seeds",
          query: {
            stage: parsedQuery.stage,
          },
          signal,
        }
      : {
          apiBaseUrl,
          parseData: parseSeedListResponse,
          pathname: "/seeds",
          query: {
            stage: parsedQuery.stage,
          },
        },
  );
};

export const fetchSeedDetail = async (
  apiBaseUrl: string,
  seedId: string,
  signal?: AbortSignal,
): Promise<import("@gloss/shared/types").SeedDetail> =>
  requestJson(
    signal
      ? {
          apiBaseUrl,
          parseData: parseSeedDetailResponse,
          pathname: `/seeds/${seedId}`,
          signal,
        }
      : {
          apiBaseUrl,
          parseData: parseSeedDetailResponse,
          pathname: `/seeds/${seedId}`,
        },
  );

export const updateSeed = async (
  apiBaseUrl: string,
  seedId: string,
  input: UpdateSeedInput,
): Promise<import("@gloss/shared/types").SeedDetail> =>
  requestJson({
    apiBaseUrl,
    body: input,
    method: "PATCH",
    parseData: parseUpdateSeedResponse,
    pathname: `/seeds/${seedId}`,
  });

export const requestSeedEnrichment = async (
  apiBaseUrl: string,
  seedId: string,
  options?: {
    force?: boolean;
  },
): Promise<SeedEnrichment> =>
  requestJson({
    apiBaseUrl,
    body: options?.force ? { force: true } : {},
    method: "POST",
    parseData: parseSeedEnrichmentResponse,
    pathname: `/seeds/${seedId}/enrich`,
  });

export const fetchReviewQueue = async (
  apiBaseUrl: string,
  signal?: AbortSignal,
): Promise<ReviewQueueSummary> =>
  requestJson(
    signal
      ? {
          apiBaseUrl,
          parseData: parseReviewQueueResponse,
          pathname: "/review/queue",
          signal,
        }
      : {
          apiBaseUrl,
          parseData: parseReviewQueueResponse,
          pathname: "/review/queue",
        },
  );

export const startReviewSession = async (
  apiBaseUrl: string,
  limit?: number,
): Promise<ReviewSessionDetail> =>
  requestJson({
    apiBaseUrl,
    body: limit === undefined ? {} : { limit },
    method: "POST",
    parseData: parseReviewSessionResponse,
    pathname: "/review/sessions",
  });

export const fetchReviewSession = async (
  apiBaseUrl: string,
  sessionId: string,
  signal?: AbortSignal,
): Promise<ReviewSessionDetail> =>
  requestJson(
    signal
      ? {
          apiBaseUrl,
          parseData: parseReviewSessionResponse,
          pathname: `/review/sessions/${sessionId}`,
          signal,
        }
      : {
          apiBaseUrl,
          parseData: parseReviewSessionResponse,
          pathname: `/review/sessions/${sessionId}`,
        },
  );

export const submitReviewCard = async (
  apiBaseUrl: string,
  input: {
    cardId: string;
    sessionId: string;
    submission: ReviewSubmissionInput;
  },
): Promise<{
  result: ReviewSubmissionResult;
  session: ReviewSessionDetail;
}> =>
  requestJson({
    apiBaseUrl,
    body: parseReviewSubmissionInput(input.submission),
    method: "POST",
    parseData: parseSubmitReviewCardResponse,
    pathname: `/review/sessions/${input.sessionId}/cards/${input.cardId}/submit`,
  });

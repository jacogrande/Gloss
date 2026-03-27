import type {
  CreateSeedInput,
  ListSeedsQuery,
  SeedEnrichment,
} from "@gloss/shared/types";
import { requestJson } from "./http";
import {
  parseCreateSeedInput,
  parseCreateSeedResponse,
  parseListSeedsQuery,
  parseSeedDetailResponse,
  parseSeedEnrichmentResponse,
  parseSeedListResponse,
  parseSessionResponse,
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

export const requestSeedEnrichment = async (
  apiBaseUrl: string,
  seedId: string,
): Promise<SeedEnrichment> =>
  requestJson({
    apiBaseUrl,
    method: "POST",
    parseData: parseSeedEnrichmentResponse,
    pathname: `/seeds/${seedId}/enrich`,
  });

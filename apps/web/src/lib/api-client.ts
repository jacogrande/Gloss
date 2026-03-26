import {
  createSeedResponseSchema,
  listSeedsQuerySchema,
  seedDetailResponseSchema,
  seedListResponseSchema,
  sessionResponseSchema,
} from "@gloss/shared/contracts";
import type {
  CreateSeedInput,
  ListSeedsQuery,
} from "@gloss/shared/types";
import { apiErrorResponseSchema } from "@gloss/shared/schemas";

export class ApiClientError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ApiClientError";
  }
}

const buildUrl = (
  apiBaseUrl: string,
  pathname: string,
  query?: Record<string, string | undefined>,
): string => {
  const url = new URL(pathname, `${apiBaseUrl}/`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
  }

  return url.toString();
};

const unreadableResponseError = (response: Response): ApiClientError =>
  new ApiClientError(
    response.ok ? "INVALID_RESPONSE" : "INVALID_ERROR_RESPONSE",
    response.ok
      ? "The server returned an unreadable response."
      : "The server returned an unreadable error response.",
  );

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();

  if (text.length === 0) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw unreadableResponseError(response);
  }
};

const requestJson = async <TData>(input: {
  apiBaseUrl: string;
  body?: unknown;
  method?: "GET" | "POST";
  pathname: string;
  query?: Record<string, string | undefined>;
  responseSchema: {
    parse: (value: unknown) => { data: TData };
  };
  signal?: AbortSignal;
}): Promise<TData> => {
  const requestInit: RequestInit = {
    credentials: "include",
    headers: {
      accept: "application/json",
    },
    method: input.method ?? "GET",
  };

  if (input.body) {
    requestInit.body = JSON.stringify(input.body);
    requestInit.headers = {
      ...requestInit.headers,
      "content-type": "application/json",
    };
  }

  if (input.signal) {
    requestInit.signal = input.signal;
  }

  const response = await fetch(
    buildUrl(input.apiBaseUrl, input.pathname, input.query),
    requestInit,
  );
  const body = await parseResponseBody(response);

  if (!response.ok) {
    try {
      const error = apiErrorResponseSchema.parse(body);

      throw new ApiClientError(error.error.code, error.error.message);
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }

      throw unreadableResponseError(response);
    }
  }

  try {
    return input.responseSchema.parse(body).data;
  } catch {
    throw unreadableResponseError(response);
  }
};

export const fetchSessionSnapshot = async (
  apiBaseUrl: string,
  signal?: AbortSignal,
): Promise<(typeof sessionResponseSchema)["_output"]["data"]> =>
  requestJson(
    signal
      ? {
          apiBaseUrl,
          pathname: "/api/me",
          responseSchema: sessionResponseSchema,
          signal,
        }
      : {
          apiBaseUrl,
          pathname: "/api/me",
          responseSchema: sessionResponseSchema,
        },
  );

export const createSeed = async (
  apiBaseUrl: string,
  input: CreateSeedInput,
): Promise<(typeof createSeedResponseSchema)["_output"]["data"]> =>
  requestJson({
    apiBaseUrl,
    body: input,
    method: "POST",
    pathname: "/capture/seeds",
    responseSchema: createSeedResponseSchema,
  });

export const fetchSeedList = async (
  apiBaseUrl: string,
  query: ListSeedsQuery,
  signal?: AbortSignal,
): Promise<(typeof seedListResponseSchema)["_output"]["data"]> => {
  const parsedQuery = listSeedsQuerySchema.parse(query);

  return requestJson(
    signal
      ? {
          apiBaseUrl,
          pathname: "/seeds",
          query: {
            stage: parsedQuery.stage,
          },
          responseSchema: seedListResponseSchema,
          signal,
        }
      : {
          apiBaseUrl,
          pathname: "/seeds",
          query: {
            stage: parsedQuery.stage,
          },
          responseSchema: seedListResponseSchema,
        },
  );
};

export const fetchSeedDetail = async (
  apiBaseUrl: string,
  seedId: string,
  signal?: AbortSignal,
): Promise<(typeof seedDetailResponseSchema)["_output"]["data"]> =>
  requestJson(
    signal
      ? {
          apiBaseUrl,
          pathname: `/seeds/${seedId}`,
          responseSchema: seedDetailResponseSchema,
          signal,
        }
      : {
          apiBaseUrl,
          pathname: `/seeds/${seedId}`,
          responseSchema: seedDetailResponseSchema,
        },
  );

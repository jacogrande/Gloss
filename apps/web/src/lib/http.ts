export class ApiClientError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ApiClientError";
  }
}

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null;

export const buildUrl = (
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

export const parseResponseBody = async (response: Response): Promise<unknown> => {
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

const parseApiError = (value: unknown): ApiClientError | null => {
  if (!isRecord(value) || value.ok !== false || !isRecord(value.error)) {
    return null;
  }

  const code = value.error.code;
  const message = value.error.message;

  if (typeof code !== "string" || typeof message !== "string") {
    return null;
  }

  return new ApiClientError(code, message);
};

export const toApiClientError = (
  response: Response,
  body: unknown,
): ApiClientError => parseApiError(body) ?? unreadableResponseError(response);

type RequestDocumentInput = {
  apiBaseUrl: string;
  body?: unknown;
  method?: "GET" | "POST";
  pathname: string;
  query?: Record<string, string | undefined>;
  signal?: AbortSignal;
};

export const requestDocument = async (
  input: RequestDocumentInput,
): Promise<unknown> => {
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
    throw toApiClientError(response, body);
  }

  return body;
};

type RequestJsonInput<TData> = RequestDocumentInput & {
  parseData: (value: unknown) => TData;
};

export const requestJson = async <TData>(
  input: RequestJsonInput<TData>,
): Promise<TData> => {
  const body = await requestDocument(input);

  try {
    return input.parseData(body);
  } catch {
    throw new ApiClientError(
      "INVALID_RESPONSE",
      "The server returned an unreadable response.",
    );
  }
};

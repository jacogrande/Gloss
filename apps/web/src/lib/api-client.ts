import { sessionResponseSchema } from "@gloss/shared/contracts";
import { apiErrorResponseSchema } from "@gloss/shared/schemas";

export class ApiClientError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ApiClientError";
  }
}

export const fetchSessionSnapshot = async (
  apiBaseUrl: string,
): Promise<(typeof sessionResponseSchema)["_output"]["data"]> => {
  const response = await fetch(`${apiBaseUrl}/api/me`, {
    credentials: "include",
    headers: {
      accept: "application/json",
    },
  });
  const body: unknown = await response.json();

  if (!response.ok) {
    const error = apiErrorResponseSchema.parse(body);

    throw new ApiClientError(error.error.code, error.error.message);
  }

  return sessionResponseSchema.parse(body).data;
};

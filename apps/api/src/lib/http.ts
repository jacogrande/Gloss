import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { isAppError } from "@gloss/shared/errors";

type ErrorBody = {
  error: {
    code: "AUTH_UNAUTHORIZED" | "CONFLICT" | "INTERNAL_ERROR" | "NOT_FOUND" | "VALIDATION_ERROR";
    message: string;
    requestId?: string;
  };
  ok: false;
};

const buildErrorBody = (
  code: ErrorBody["error"]["code"],
  message: string,
  requestId?: string,
): ErrorBody => ({
  error: {
    code,
    message,
    ...(requestId ? { requestId } : {}),
  },
  ok: false,
});

export const jsonSuccess = <TData>(
  context: Context,
  data: TData,
  status: ContentfulStatusCode = 200,
): Response =>
  context.json(
    {
      data,
      ok: true,
    },
    status,
  );

export const toErrorResponse = (
  error: unknown,
  requestId?: string,
): { body: ErrorBody; status: number } => {
  if (isAppError(error)) {
    const appError = error;

    return {
      body: buildErrorBody(
        appError.code,
        appError.message,
        appError.requestId ?? requestId,
      ),
      status: appError.status,
    };
  }

  return {
    body: buildErrorBody(
      "INTERNAL_ERROR",
      "An unexpected error occurred.",
      requestId,
    ),
    status: 500,
  };
};

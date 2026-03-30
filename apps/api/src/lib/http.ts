import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";

import { isAppError } from "@gloss/shared/errors";

type ErrorBody = {
  error: {
    code:
      | "AUTH_UNAUTHORIZED"
      | "CONFLICT"
      | "ENRICHMENT_CONFLICT"
      | "ENRICHMENT_EVIDENCE_UNAVAILABLE"
      | "ENRICHMENT_PROVIDER_ERROR"
      | "ENRICHMENT_SCHEMA_INVALID"
      | "INTERNAL_ERROR"
      | "NOT_FOUND"
      | "RATE_LIMITED"
      | "REVIEW_CONFLICT"
      | "REVIEW_PROVIDER_ERROR"
      | "REVIEW_SCHEMA_INVALID"
      | "VALIDATION_ERROR";
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

  if (error instanceof ZodError) {
    return {
      body: buildErrorBody(
        "VALIDATION_ERROR",
        error.issues
          .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
          .join("; "),
        requestId,
      ),
      status: 400,
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

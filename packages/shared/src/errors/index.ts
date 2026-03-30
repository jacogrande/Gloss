import { z } from "zod";

import { apiErrorCodeValues } from "../values/index";

export const apiErrorCodeSchema = z.enum(apiErrorCodeValues);

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export type ApiErrorPayload = {
  code: ApiErrorCode;
  message: string;
  requestId?: string;
};

export class AppError extends Error {
  public readonly code: ApiErrorCode;

  public readonly status: number;

  public readonly requestId: string | undefined;

  public constructor(options: {
    code: ApiErrorCode;
    message: string;
    requestId?: string;
    status: number;
  }) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId;
  }
}

export const isAppError = (value: unknown): value is AppError =>
  value instanceof AppError;

export const unauthorizedError = (requestId?: string): AppError =>
  new AppError({
    code: "AUTH_UNAUTHORIZED",
    message: "Authentication is required to access this resource.",
    status: 401,
    ...(requestId ? { requestId } : {}),
  });

export const notFoundError = (
  message: string,
  requestId?: string,
): AppError =>
  new AppError({
    code: "NOT_FOUND",
    message,
    status: 404,
    ...(requestId ? { requestId } : {}),
  });

export const rateLimitedError = (
  message: string,
  requestId?: string,
): AppError =>
  new AppError({
    code: "RATE_LIMITED",
    message,
    status: 429,
    ...(requestId ? { requestId } : {}),
  });

export const validationError = (
  message: string,
  requestId?: string,
): AppError =>
  new AppError({
    code: "VALIDATION_ERROR",
    message,
    status: 400,
    ...(requestId ? { requestId } : {}),
  });

export const conflictError = (
  message: string,
  requestId?: string,
): AppError =>
  new AppError({
    code: "CONFLICT",
    message,
    status: 409,
    ...(requestId ? { requestId } : {}),
  });

export const enrichmentConflictError = (
  message: string,
  requestId?: string,
): AppError =>
  new AppError({
    code: "ENRICHMENT_CONFLICT",
    message,
    status: 409,
    ...(requestId ? { requestId } : {}),
  });

export const enrichmentEvidenceUnavailableError = (
  message: string,
  requestId?: string,
): AppError =>
  new AppError({
    code: "ENRICHMENT_EVIDENCE_UNAVAILABLE",
    message,
    status: 409,
    ...(requestId ? { requestId } : {}),
  });

export const enrichmentProviderError = (
  message: string,
  requestId?: string,
): AppError =>
  new AppError({
    code: "ENRICHMENT_PROVIDER_ERROR",
    message,
    status: 500,
    ...(requestId ? { requestId } : {}),
  });

export const enrichmentSchemaInvalidError = (
  message: string,
  requestId?: string,
): AppError =>
  new AppError({
    code: "ENRICHMENT_SCHEMA_INVALID",
    message,
    status: 500,
    ...(requestId ? { requestId } : {}),
  });

export const reviewConflictError = (
  message: string,
  requestId?: string,
): AppError =>
  new AppError({
    code: "REVIEW_CONFLICT",
    message,
    status: 409,
    ...(requestId ? { requestId } : {}),
  });

export const reviewProviderError = (
  message: string,
  requestId?: string,
): AppError =>
  new AppError({
    code: "REVIEW_PROVIDER_ERROR",
    message,
    status: 500,
    ...(requestId ? { requestId } : {}),
  });

export const reviewSchemaInvalidError = (
  message: string,
  requestId?: string,
): AppError =>
  new AppError({
    code: "REVIEW_SCHEMA_INVALID",
    message,
    status: 500,
    ...(requestId ? { requestId } : {}),
  });

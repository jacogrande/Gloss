import { z } from "zod";

export const apiErrorCodeSchema = z.enum([
  "AUTH_UNAUTHORIZED",
  "CONFLICT",
  "INTERNAL_ERROR",
  "NOT_FOUND",
  "VALIDATION_ERROR",
]);

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

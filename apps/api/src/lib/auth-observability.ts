import type { ApiErrorCode } from "@gloss/shared/errors";

export type AuthJourney =
  | "auth.sign_in"
  | "auth.sign_out"
  | "auth.sign_up";

const textEncoder = new TextEncoder();

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");

export const resolveAuthJourney = (path: string): AuthJourney | null => {
  if (path.endsWith("/sign-in/email")) {
    return "auth.sign_in";
  }

  if (path.endsWith("/sign-out")) {
    return "auth.sign_out";
  }

  if (path.endsWith("/sign-up/email")) {
    return "auth.sign_up";
  }

  return null;
};

export const hashEmailActorTag = async (email: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(email.trim().toLowerCase()),
  );

  return `email:${toHex(new Uint8Array(digest)).slice(0, 16)}`;
};

export const extractEmailActorTag = async (
  request: Request,
): Promise<string | null> => {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }

  try {
    const body = (await request.clone().json()) as { email?: unknown };

    if (typeof body.email !== "string" || body.email.trim().length === 0) {
      return null;
    }

    return hashEmailActorTag(body.email);
  } catch {
    return null;
  }
};

export const resolveAuthFailureErrorCode = (input: {
  journey: AuthJourney | null;
  status: number;
}): ApiErrorCode | null => {
  if (input.status < 400 || input.journey === null) {
    return null;
  }

  if (input.journey === "auth.sign_in" && input.status === 401) {
    return "AUTH_UNAUTHORIZED";
  }

  if (input.status >= 500) {
    return "INTERNAL_ERROR";
  }

  return "VALIDATION_ERROR";
};

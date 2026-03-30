import { rateLimitedError } from "@gloss/shared/errors";

import type { RequestRateLimitRow } from "../db/schema";

export const requestRateLimitPolicyKeys = [
  "capture.create",
  "review.session.start",
  "review.session.submit",
  "seeds.enrich",
] as const;

export type RequestRateLimitPolicyKey =
  typeof requestRateLimitPolicyKeys[number];

export type RequestRateLimitPolicy = {
  key: RequestRateLimitPolicyKey;
  limit: number;
  windowSeconds: number;
};

export type RequestRateLimitPolicies = Record<
  RequestRateLimitPolicyKey,
  RequestRateLimitPolicy
>;

export type RequestRateLimitVerdict = {
  allowed: boolean;
  limit: number;
  remaining: number;
  requestCount: number;
  retryAfterSeconds: number;
  windowEndsAt: Date;
  windowStartedAt: Date;
};

export const defaultRequestRateLimitPolicies: RequestRateLimitPolicies = {
  "capture.create": {
    key: "capture.create",
    limit: 12,
    windowSeconds: 60,
  },
  "review.session.start": {
    key: "review.session.start",
    limit: 12,
    windowSeconds: 60,
  },
  "review.session.submit": {
    key: "review.session.submit",
    limit: 90,
    windowSeconds: 60,
  },
  "seeds.enrich": {
    key: "seeds.enrich",
    limit: 18,
    windowSeconds: 60,
  },
};

const toWindowStartMs = (now: Date, windowSeconds: number): number =>
  Math.floor(now.getTime() / (windowSeconds * 1_000)) * windowSeconds * 1_000;

export const resolveRateLimitWindowStart = (
  now: Date,
  windowSeconds: number,
): Date => new Date(toWindowStartMs(now, windowSeconds));

export const resolveRateLimitWindowEnd = (
  now: Date,
  windowSeconds: number,
): Date => new Date(toWindowStartMs(now, windowSeconds) + windowSeconds * 1_000);

export const buildRequestRateLimitVerdict = (input: {
  now: Date;
  policy: RequestRateLimitPolicy;
  row: Pick<RequestRateLimitRow, "requestCount" | "windowStartedAt">;
}): RequestRateLimitVerdict => {
  const windowEndsAt = resolveRateLimitWindowEnd(
    input.row.windowStartedAt,
    input.policy.windowSeconds,
  );
  const retryAfterMs = Math.max(windowEndsAt.getTime() - input.now.getTime(), 0);
  const remaining = Math.max(input.policy.limit - input.row.requestCount, 0);

  return {
    allowed: input.row.requestCount <= input.policy.limit,
    limit: input.policy.limit,
    remaining,
    requestCount: input.row.requestCount,
    retryAfterSeconds: Math.ceil(retryAfterMs / 1_000),
    windowEndsAt,
    windowStartedAt: input.row.windowStartedAt,
  };
};

export const assertRateLimitVerdict = (input: {
  policy: RequestRateLimitPolicy;
  requestId?: string;
  verdict: RequestRateLimitVerdict;
}): RequestRateLimitVerdict => {
  if (input.verdict.allowed) {
    return input.verdict;
  }

  throw rateLimitedError(
    `Too many ${input.policy.key} requests. Retry in ${input.verdict.retryAfterSeconds} seconds.`,
    input.requestId,
  );
};

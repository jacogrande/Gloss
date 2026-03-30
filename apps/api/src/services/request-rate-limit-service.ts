import type { Logger } from "../lib/logger";
import {
  assertRateLimitVerdict,
  buildRequestRateLimitVerdict,
  defaultRequestRateLimitPolicies,
  resolveRateLimitWindowStart,
  type RequestRateLimitPolicies,
  type RequestRateLimitPolicyKey,
  type RequestRateLimitVerdict,
} from "../lib/request-rate-limit-contracts";
import {
  createRequestRateLimitRepository,
  type RequestRateLimitRepository,
} from "../repositories/request-rate-limit-repository";
import type { GlossDatabase } from "../lib/db";

export type RequestRateLimitService = {
  enforce: (input: {
    actorKey: string;
    policyKey: RequestRateLimitPolicyKey;
    requestId?: string;
  }) => Promise<RequestRateLimitVerdict>;
};

export const createRequestRateLimitService = (input: {
  logger: Logger;
  now?: () => Date;
  policies?: RequestRateLimitPolicies;
  repository: RequestRateLimitRepository;
}): RequestRateLimitService => {
  const now = input.now ?? (() => new Date());
  const policies = input.policies ?? defaultRequestRateLimitPolicies;

  return {
    async enforce(options) {
      const policy = policies[options.policyKey];
      const observedAt = now();
      const row = await input.repository.consume({
        actorKey: options.actorKey,
        now: observedAt,
        policyKey: policy.key,
        windowSeconds: policy.windowSeconds,
        windowStartedAt: resolveRateLimitWindowStart(
          observedAt,
          policy.windowSeconds,
        ),
      });
      const verdict = buildRequestRateLimitVerdict({
        now: observedAt,
        policy,
        row,
      });

      input.logger.info("rate_limit.checked", {
        actorKey: options.actorKey,
        allowed: verdict.allowed,
        limit: verdict.limit,
        policyKey: policy.key,
        remaining: verdict.remaining,
        requestCount: verdict.requestCount,
        requestId: options.requestId,
        retryAfterSeconds: verdict.retryAfterSeconds,
        windowStartedAt: verdict.windowStartedAt.toISOString(),
      });

      return assertRateLimitVerdict({
        policy,
        verdict,
        ...(options.requestId
          ? {
              requestId: options.requestId,
            }
          : {}),
      });
    },
  };
};

export const createDefaultRequestRateLimitService = (input: {
  db: GlossDatabase;
  logger: Logger;
  now?: () => Date;
  policies?: RequestRateLimitPolicies;
}): RequestRateLimitService =>
  createRequestRateLimitService({
    logger: input.logger,
    repository: createRequestRateLimitRepository(input.db),
    ...(input.now
      ? {
          now: input.now,
        }
      : {}),
    ...(input.policies
      ? {
          policies: input.policies,
        }
      : {}),
  });

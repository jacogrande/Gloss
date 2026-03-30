import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildRequestRateLimitVerdict,
  resolveRateLimitWindowEnd,
  resolveRateLimitWindowStart,
} from "../src/lib/request-rate-limit-contracts";

describe("request rate limit contracts", () => {
  it("floors timestamps into stable rate-limit windows", () => {
    const now = new Date("2026-03-29T12:34:56.789Z");
    const windowStartedAt = resolveRateLimitWindowStart(now, 60);
    const windowEndsAt = resolveRateLimitWindowEnd(now, 60);

    expect(windowStartedAt.toISOString()).toBe("2026-03-29T12:34:00.000Z");
    expect(windowEndsAt.toISOString()).toBe("2026-03-29T12:35:00.000Z");
  });

  it("computes a blocked verdict once the limit is exceeded", () => {
    const verdict = buildRequestRateLimitVerdict({
      now: new Date("2026-03-29T12:34:45.000Z"),
      policy: {
        key: "capture.create",
        limit: 2,
        windowSeconds: 60,
      },
      row: {
        requestCount: 3,
        windowStartedAt: new Date("2026-03-29T12:34:00.000Z"),
      },
    });

    expect(verdict.allowed).toBe(false);
    expect(verdict.remaining).toBe(0);
    expect(verdict.retryAfterSeconds).toBe(15);
  });
});

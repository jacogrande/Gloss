import { describe, expect, it } from "vitest";
import type { Pool } from "pg";

import { loadServerEnv } from "../src/lib/env";
import {
  createAuthOptions,
  resolveAuthAdvancedOptions,
  resolveAuthTrustedOrigins,
} from "../src/lib/auth";
import type { ProfileService } from "../src/services/profile-service";
import type { ProductEventService } from "../src/services/product-event-service";

const createEnv = (
  overrides?: Partial<Record<string, string>>,
): ReturnType<typeof loadServerEnv> =>
  loadServerEnv({
    API_ORIGIN: "http://127.0.0.1:8787",
    BETTER_AUTH_SECRET: "test-secret-for-gloss",
    BETTER_AUTH_URL: "http://127.0.0.1:8787",
    DATABASE_URL: "postgresql://gloss:gloss@127.0.0.1:54329/gloss_test",
    LOG_LEVEL: "error",
    NODE_ENV: "test",
    PORT: "8787",
    WEB_ORIGIN: "http://127.0.0.1:5173",
    ...(overrides ?? {}),
  });

describe("auth config", () => {
  it("enables secure cookies when the hosted auth origin is https", () => {
    const env = createEnv({
      API_ORIGIN: "https://api.preview.gloss.test",
      BETTER_AUTH_URL: "https://api.preview.gloss.test",
      WEB_ORIGIN: "https://app.preview.gloss.test",
    });

    expect(resolveAuthAdvancedOptions(env).useSecureCookies).toBe(true);
  });

  it("enables cross-subdomain cookies when COOKIE_DOMAIN is configured", () => {
    const env = createEnv({
      API_ORIGIN: "https://api.preview.gloss.test",
      BETTER_AUTH_URL: "https://api.preview.gloss.test",
      COOKIE_DOMAIN: "preview.gloss.test",
      WEB_ORIGIN: "https://app.preview.gloss.test",
    });

    expect(resolveAuthAdvancedOptions(env).crossSubDomainCookies).toEqual({
      domain: "preview.gloss.test",
      enabled: true,
    });
  });

  it("deduplicates trusted origins while preserving the required auth and web origins", () => {
    const env = createEnv();

    expect(resolveAuthTrustedOrigins(env)).toEqual([
      "http://127.0.0.1:5173",
      "http://127.0.0.1:8787",
    ]);
  });

  it("applies hosted cookie and trusted-origin configuration through createAuthOptions", () => {
    const env = createEnv({
      API_ORIGIN: "https://api.preview.gloss.test",
      BETTER_AUTH_URL: "https://api.preview.gloss.test",
      COOKIE_DOMAIN: "preview.gloss.test",
      WEB_ORIGIN: "https://app.preview.gloss.test",
    });
    const pool = {} as Pool;
    const profileService = {
      ensureProfile: () =>
        Promise.resolve({
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        userId: "test-user",
        }),
      getProfileByUserId: () => Promise.resolve(null),
    } as ProfileService;
    const productEventService = {
      listEvents: () => Promise.resolve([]),
      listSeedSnapshots: () => Promise.resolve([]),
      record: () => Promise.resolve(undefined),
    } as ProductEventService;

    const options = createAuthOptions({
      env,
      logger: {
        debug: () => undefined,
        error: () => undefined,
        info: () => undefined,
        warn: () => undefined,
      },
      pool,
      productEventService,
      profileService,
    });

    expect(options.baseURL).toBe("https://api.preview.gloss.test");
    expect(options.database).toBe(pool);
    expect(options.advanced.useSecureCookies).toBe(true);
    expect(options.advanced.crossSubDomainCookies).toEqual({
      domain: "preview.gloss.test",
      enabled: true,
    });
    expect(options.trustedOrigins).toEqual([
      "https://app.preview.gloss.test",
      "https://api.preview.gloss.test",
    ]);
  });

  it("rejects COOKIE_DOMAIN values that include a scheme or port", () => {
    expect(() =>
      createEnv({
        COOKIE_DOMAIN: "https://preview.gloss.test:443",
      }),
    ).toThrow(/COOKIE_DOMAIN/);
  });
});

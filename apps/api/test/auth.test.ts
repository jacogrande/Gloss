import { describe, expect, it } from "vitest";

import { loadServerEnv } from "../src/lib/env";
import {
  resolveAuthAdvancedOptions,
  resolveAuthTrustedOrigins,
} from "../src/lib/auth";

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
});

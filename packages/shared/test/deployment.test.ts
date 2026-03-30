import {
  describe,
  expect,
  it,
} from "vitest";

import { deriveDeploymentEnvReport } from "../src/deployment/index";
import type {
  ServerEnv,
  WebEnv,
} from "../src/env/index";

const createApiEnv = (overrides: Partial<ServerEnv> = {}): ServerEnv => ({
  API_ORIGIN: "https://api.preview.gloss.test",
  BETTER_AUTH_SECRET: "development-secret-value-at-least-32-chars",
  BETTER_AUTH_URL: "https://api.preview.gloss.test",
  COOKIE_DOMAIN: "preview.gloss.test",
  DATABASE_URL: "postgresql://gloss:gloss@127.0.0.1:54329/gloss",
  ENRICHMENT_PROVIDER_MODE: "fixture",
  LOG_LEVEL: "info",
  MERRIAM_WEBSTER_DICTIONARY_API_KEY: undefined,
  MERRIAM_WEBSTER_THESAURUS_API_KEY: undefined,
  NODE_ENV: "production",
  OPENAI_API_KEY: undefined,
  OPENAI_MODEL: "gpt-5-mini-2025-08-07",
  PORT: 8787,
  WEB_ORIGIN: "https://preview.gloss.test",
  ...overrides,
});

const createWebEnv = (overrides: Partial<WebEnv> = {}): WebEnv => ({
  MODE: "production",
  VITE_API_BASE_URL: "https://api.preview.gloss.test",
  ...overrides,
});

describe("deriveDeploymentEnvReport", () => {
  it("passes aligned hosted preview configuration", () => {
    const report = deriveDeploymentEnvReport({
      apiEnv: createApiEnv(),
      environment: "preview",
      target: "combined",
      webEnv: createWebEnv(),
    });

    expect(report.status).toBe("pass");
    expect(
      report.checks.find((check) => check.id === "web_api_alignment"),
    ).toEqual({
      id: "web_api_alignment",
      message: "VITE_API_BASE_URL matches the API origin.",
      status: "pass",
    });
  });

  it("fails misaligned web/api origins", () => {
    const report = deriveDeploymentEnvReport({
      apiEnv: createApiEnv(),
      environment: "staging",
      target: "combined",
      webEnv: createWebEnv({
        VITE_API_BASE_URL: "https://wrong.example.com",
      }),
    });

    expect(report.status).toBe("fail");
    expect(
      report.checks.find((check) => check.id === "web_api_alignment"),
    ).toEqual({
      id: "web_api_alignment",
      message:
        "VITE_API_BASE_URL must match API_ORIGIN for split-origin browser requests.",
      status: "fail",
    });
  });

  it("warns when hosted deployments omit cookie domain", () => {
    const report = deriveDeploymentEnvReport({
      apiEnv: createApiEnv({
        COOKIE_DOMAIN: undefined,
      }),
      environment: "private-alpha",
      target: "combined",
      webEnv: createWebEnv(),
    });

    expect(report.status).toBe("warn");
    expect(
      report.checks.find((check) => check.id === "cookie_domain_alignment"),
    ).toEqual({
      id: "cookie_domain_alignment",
      message:
        "COOKIE_DOMAIN is unset. This is acceptable unless the deployed domain strategy requires cross-subdomain cookies.",
      status: "warn",
    });
  });

  it("fails local-only hosted origins", () => {
    const report = deriveDeploymentEnvReport({
      apiEnv: createApiEnv({
        API_ORIGIN: "http://127.0.0.1:8787",
        BETTER_AUTH_URL: "http://127.0.0.1:8787",
        WEB_ORIGIN: "http://127.0.0.1:5173",
      }),
      environment: "preview",
      target: "combined",
      webEnv: createWebEnv({
        VITE_API_BASE_URL: "http://127.0.0.1:8787",
      }),
    });

    expect(report.status).toBe("fail");
    expect(
      report.checks.find((check) => check.id === "hosted_origins_are_secure")
        ?.status,
    ).toBe("fail");
    expect(
      report.checks.find((check) => check.id === "hosted_origins_are_not_local")
        ?.status,
    ).toBe("fail");
  });
});

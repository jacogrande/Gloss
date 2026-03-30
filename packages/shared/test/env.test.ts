import { describe, expect, it } from "vitest";

import { parseServerEnv, parseWebEnv } from "../src/env/index";

describe("environment parsing", () => {
  it("parses the server environment contract", () => {
    const env = parseServerEnv({
      API_ORIGIN: "http://127.0.0.1:8787",
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://127.0.0.1:8787",
      DATABASE_URL: "postgresql://gloss:gloss@127.0.0.1:54329/gloss",
      LOG_LEVEL: "debug",
      NODE_ENV: "development",
      PORT: "8787",
      WEB_ORIGIN: "http://127.0.0.1:5173",
    });

    expect(env.PORT).toBe(8787);
    expect(env.LOG_LEVEL).toBe("debug");
  });

  it("rejects an invalid server environment", () => {
    expect(() =>
      parseServerEnv({
        API_ORIGIN: "not-a-url",
        BETTER_AUTH_SECRET: "",
        BETTER_AUTH_URL: "http://127.0.0.1:8787",
        DATABASE_URL: "",
        WEB_ORIGIN: "http://127.0.0.1:5173",
      }),
    ).toThrowError("Invalid server environment");
  });

  it("rejects COOKIE_DOMAIN values that include a scheme or port", () => {
    expect(() =>
      parseServerEnv({
        API_ORIGIN: "https://api.preview.gloss.test",
        BETTER_AUTH_SECRET: "secret",
        BETTER_AUTH_URL: "https://api.preview.gloss.test",
        COOKIE_DOMAIN: "https://preview.gloss.test:443",
        DATABASE_URL: "postgresql://gloss:gloss@127.0.0.1:54329/gloss",
        WEB_ORIGIN: "https://app.preview.gloss.test",
      }),
    ).toThrowError("COOKIE_DOMAIN");
  });

  it("parses the web environment contract", () => {
    const env = parseWebEnv({
      MODE: "development",
      VITE_API_BASE_URL: "http://127.0.0.1:8787",
    });

    expect(env.VITE_API_BASE_URL).toBe("http://127.0.0.1:8787");
  });
});

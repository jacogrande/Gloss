import { loadServerEnv } from "../../apps/api/src/lib/env";
import type { ServerEnv } from "@gloss/shared/env";

export const resolveScriptEnv = (): ServerEnv =>
  loadServerEnv({
    API_ORIGIN: process.env.API_ORIGIN ?? "http://127.0.0.1:8787",
    BETTER_AUTH_SECRET:
      process.env.BETTER_AUTH_SECRET ??
      "development-secret-value-at-least-32-chars",
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:8787",
    DATABASE_URL:
      process.env.DATABASE_URL ?? "postgresql://gloss:gloss@127.0.0.1:54329/gloss",
    ENRICHMENT_PROVIDER_MODE: process.env.ENRICHMENT_PROVIDER_MODE ?? "fixture",
    LOG_LEVEL: process.env.LOG_LEVEL ?? "debug",
    MERRIAM_WEBSTER_DICTIONARY_API_KEY:
      process.env.MERRIAM_WEBSTER_DICTIONARY_API_KEY,
    MERRIAM_WEBSTER_THESAURUS_API_KEY:
      process.env.MERRIAM_WEBSTER_THESAURUS_API_KEY,
    NODE_ENV: process.env.NODE_ENV ?? "development",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-5-mini-2025-08-07",
    PORT: process.env.PORT ?? "8787",
    WEB_ORIGIN: process.env.WEB_ORIGIN ?? "http://127.0.0.1:5173",
  });

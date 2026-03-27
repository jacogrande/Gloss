import { describe, expect, it } from "vitest";

import {
  createSeedInputSchema,
  healthResponseSchema,
  seedDetailResponseSchema,
  seedListResponseSchema,
  sessionResponseSchema,
} from "../src/contracts/index";
import { apiErrorResponseSchema } from "../src/schemas/index";

describe("shared contracts", () => {
  it("parses the health response contract", () => {
    const parsed = healthResponseSchema.parse({
      data: {
        service: "api",
        status: "ok",
        timestamp: "2026-03-26T12:34:56.000Z",
      },
      ok: true,
    });

    expect(parsed.data.service).toBe("api");
  });

  it("parses the session response contract", () => {
    const parsed = sessionResponseSchema.parse({
      data: {
        profile: {
          createdAt: "2026-03-26T12:34:56.000Z",
          updatedAt: "2026-03-26T12:34:56.000Z",
          userId: "user_123",
        },
        session: {
          expiresAt: "2026-03-26T12:34:56.000Z",
          id: "session_123",
          userId: "user_123",
        },
        user: {
          email: "reader@example.com",
          id: "user_123",
          image: null,
          name: "Reader",
        },
      },
      ok: true,
    });

    expect(parsed.data.user.email).toBe("reader@example.com");
  });

  it("parses the shared error envelope", () => {
    const parsed = apiErrorResponseSchema.parse({
      error: {
        code: "AUTH_UNAUTHORIZED",
        message: "Authentication is required to access this resource.",
        requestId: "123e4567-e89b-12d3-a456-426614174000",
      },
      ok: false,
    });

    expect(parsed.error.code).toBe("AUTH_UNAUTHORIZED");
  });

  it("parses the create seed input contract", () => {
    const parsed = createSeedInputSchema.parse({
      sentence: "The prose became unexpectedly lapidary by the final chapter.",
      source: {
        kind: "book",
        title: "Collected Essays",
      },
      word: "lapidary",
    });

    expect(parsed.source?.kind).toBe("book");
    expect(parsed.word).toBe("lapidary");
  });

  it("parses the seed list response contract", () => {
    const parsed = seedListResponseSchema.parse({
      data: {
        items: [
          {
            createdAt: "2026-03-26T12:34:56.000Z",
            id: "seed_123",
            primarySentence:
              "The prose became unexpectedly lapidary by the final chapter.",
            source: {
              author: "A. Reader",
              id: "source_123",
              kind: "book",
              title: "Collected Essays",
              url: null,
            },
            stage: "new",
            updatedAt: "2026-03-26T12:34:56.000Z",
            word: "lapidary",
          },
        ],
        total: 1,
      },
      ok: true,
    });

    expect(parsed.data.items[0]?.stage).toBe("new");
  });

  it("parses the seed detail response contract", () => {
    const parsed = seedDetailResponseSchema.parse({
      data: {
        contexts: [
          {
            createdAt: "2026-03-26T12:34:56.000Z",
            id: "context_123",
            isPrimary: true,
            kind: "sentence",
            text: "The prose became unexpectedly lapidary by the final chapter.",
          },
        ],
        createdAt: "2026-03-26T12:34:56.000Z",
        enrichment: null,
        id: "seed_123",
        primarySentence:
          "The prose became unexpectedly lapidary by the final chapter.",
        source: null,
        stage: "new",
        updatedAt: "2026-03-26T12:34:56.000Z",
        word: "lapidary",
      },
      ok: true,
    });

    expect(parsed.data.contexts[0]?.kind).toBe("sentence");
  });
});

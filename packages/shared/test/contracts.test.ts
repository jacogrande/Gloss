import { describe, expect, it } from "vitest";

import {
  createSeedInputSchema,
  healthResponseSchema,
  normalizeSeedEnrichmentModelPayload,
  productEventSchema,
  productEventSchemaVersion,
  seedDetailResponseSchema,
  seedEnrichmentPayloadJsonSchema,
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

  it("exports an OpenAI-compatible enrichment schema with required nullable fields", () => {
    const required = Array.isArray(seedEnrichmentPayloadJsonSchema.required)
      ? seedEnrichmentPayloadJsonSchema.required
      : [];

    expect(required).toEqual([
      "contrastiveWord",
      "gloss",
      "morphologyNote",
      "registerNote",
      "relatedWord",
    ]);
  });

  it("normalizes nullable model payload fields back into the app payload shape", () => {
    const payload = normalizeSeedEnrichmentModelPayload({
      contrastiveWord: null,
      gloss: "Clear and easy to understand in context.",
      morphologyNote: {
        note: "Related to lucid in form and sense.",
      },
      registerNote: null,
      relatedWord: {
        note: "Both point to clarity in expression.",
        word: "lucid",
      },
    });

    expect(payload).toEqual({
      gloss: "Clear and easy to understand in context.",
      morphologyNote: {
        note: "Related to lucid in form and sense.",
      },
      relatedWord: {
        note: "Both point to clarity in expression.",
        word: "lucid",
      },
    });
  });

  it("parses typed product events", () => {
    const parsed = productEventSchema.parse({
      actorTag: "user_123",
      occurredAt: "2026-03-29T12:34:56.000Z",
      payload: {
        cardCount: 4,
        seedIds: [
          "seed_1",
          "seed_2",
        ],
      },
      reviewSessionId: "session_123",
      schemaVersion: productEventSchemaVersion,
      type: "review.session.started",
      userId: "user_123",
    });

    expect(parsed.type).toBe("review.session.started");
    if (parsed.type !== "review.session.started") {
      throw new Error("Expected a review.session.started event.");
    }

    expect(parsed.payload.cardCount).toBe(4);
    expect(parsed.payload.seedIds).toEqual([
      "seed_1",
      "seed_2",
    ]);
  });
});

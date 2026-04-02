import { describe, expect, it, vi } from "vitest";

import {
  createSeed,
  fetchSeedDetail,
  fetchSeedList,
  fetchReviewSession,
  fetchSessionSnapshot,
  requestSeedEnrichment,
  submitReviewCard,
} from "../src/lib/api-client";

describe("fetchSessionSnapshot", () => {
  it("parses the typed session payload", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
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
          }),
          {
            status: 200,
          },
        ),
      );

    const data = await fetchSessionSnapshot("http://127.0.0.1:8787");

    expect(data.user.email).toBe("reader@example.com");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/api/me",
      expect.objectContaining({
        credentials: "include",
      }),
    );

    fetchMock.mockRestore();
  });

  it("throws a typed client error for API failures", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "AUTH_UNAUTHORIZED",
              message: "Authentication is required to access this resource.",
            },
            ok: false,
          }),
          {
            status: 401,
          },
        ),
      );

    await expect(() =>
      fetchSessionSnapshot("http://127.0.0.1:8787"),
    ).rejects.toMatchObject({
      code: "AUTH_UNAUTHORIZED",
    });

    fetchMock.mockRestore();
  });

  it("throws a stable client error for unreadable non-JSON failures", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>proxy error</html>", {
        headers: {
          "content-type": "text/html",
        },
        status: 502,
      }),
    );

    await expect(() =>
      fetchSessionSnapshot("http://127.0.0.1:8787"),
    ).rejects.toMatchObject({
      code: "INVALID_ERROR_RESPONSE",
    });

    fetchMock.mockRestore();
  });

  it("creates a seed through the typed contract", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            contexts: [],
            createdAt: "2026-03-26T12:34:56.000Z",
            enrichment: null,
            id: "seed_123",
            primarySentence: null,
            source: null,
            stage: "new",
            updatedAt: "2026-03-26T12:34:56.000Z",
            word: "lapidary",
          },
          ok: true,
        }),
        { status: 201 },
      ),
    );

    const data = await createSeed("http://127.0.0.1:8787", {
      word: "lapidary",
    });

    expect(data.id).toBe("seed_123");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/capture/seeds",
      expect.objectContaining({
        body: JSON.stringify({ word: "lapidary" }),
        method: "POST",
      }),
    );

    fetchMock.mockRestore();
  });

  it("rejects empty trimmed seed words before issuing a request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(() =>
      createSeed("http://127.0.0.1:8787", {
        word: "   ",
      }),
    ).rejects.toThrow("Enter a word or phrase.");

    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it("loads a typed seed list", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            items: [
              {
                createdAt: "2026-03-26T12:34:56.000Z",
                id: "seed_123",
                primarySentence: null,
                source: null,
                stage: "new",
                updatedAt: "2026-03-26T12:34:56.000Z",
                word: "lapidary",
              },
            ],
            total: 1,
          },
          ok: true,
        }),
        { status: 200 },
      ),
    );

    const data = await fetchSeedList("http://127.0.0.1:8787", {
      stage: "new",
    });

    expect(data.total).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/seeds?stage=new",
      expect.objectContaining({
        credentials: "include",
      }),
    );

    fetchMock.mockRestore();
  });

  it("loads a typed seed detail payload", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
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
        }),
        { status: 200 },
      ),
    );

    const data = await fetchSeedDetail("http://127.0.0.1:8787", "seed_123");

    expect(data.word).toBe("lapidary");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/seeds/seed_123",
      expect.objectContaining({
        credentials: "include",
      }),
    );

    fetchMock.mockRestore();
  });

  it("requests enrichment through the typed contract", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            completedAt: "2026-03-26T12:35:10.000Z",
            createdAt: "2026-03-26T12:34:56.000Z",
            errorCode: null,
            failedAt: null,
            guardrailFlags: [],
            id: "enrichment_123",
            model: "fixture-seed-enrichment-v1",
            payload: {
              gloss: "It means notably clear and easy to understand.",
              relatedWord: {
                note: "Both words praise clarity.",
                word: "lucid",
              },
            },
            promptTemplateVersion: "seed-enrichment.v1",
            provider: "fixture",
            requestedAt: "2026-03-26T12:34:57.000Z",
            schemaVersion: "seed-enrichment-payload.v1",
            startedAt: null,
            status: "ready",
            updatedAt: "2026-03-26T12:35:10.000Z",
          },
          ok: true,
        }),
        { status: 200 },
      ),
    );

    const enrichment = await requestSeedEnrichment(
      "http://127.0.0.1:8787",
      "seed_123",
    );

    expect(enrichment.status).toBe("ready");
    expect(enrichment.payload?.relatedWord?.word).toBe("lucid");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/seeds/seed_123/enrich",
      expect.objectContaining({
        credentials: "include",
        method: "POST",
      }),
    );

    fetchMock.mockRestore();
  });

  it("supports forced enrichment refresh requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            completedAt: null,
            createdAt: "2026-03-26T12:34:56.000Z",
            errorCode: null,
            failedAt: null,
            guardrailFlags: [],
            id: "enrichment_123",
            model: "fixture-seed-enrichment-v1",
            payload: null,
            promptTemplateVersion: "seed-enrichment.v1",
            provider: "fixture",
            requestedAt: "2026-03-26T12:34:57.000Z",
            schemaVersion: "seed-enrichment-payload.v1",
            startedAt: "2026-03-26T12:34:58.000Z",
            status: "pending",
            updatedAt: "2026-03-26T12:34:58.000Z",
          },
          ok: true,
        }),
        { status: 200 },
      ),
    );

    await requestSeedEnrichment("http://127.0.0.1:8787", "seed_123", {
      force: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/seeds/seed_123/enrich",
      expect.objectContaining({
        body: JSON.stringify({ force: true }),
        credentials: "include",
        method: "POST",
      }),
    );

    fetchMock.mockRestore();
  });

  it("loads a cloze review card through the typed review session contract", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            cards: [
              {
                dimension: "recognition",
                exerciseType: "cloze_recall",
                generationSource: "model",
                id: "card_123",
                position: 0,
                promptPayload: {
                  question:
                    "Type the saved word that best completes the blank. Especially clear and easy to follow.",
                  sentence: "Her explanation was ____ even under pressure.",
                  type: "cloze_recall",
                },
                seedId: "seed_123",
                status: "pending",
              },
            ],
            session: {
              cardCount: 1,
              completedAt: null,
              currentCardId: "card_123",
              id: "session_123",
              remainingCount: 1,
              startedAt: "2026-03-26T12:34:56.000Z",
              status: "active",
            },
          },
          ok: true,
        }),
        { status: 200 },
      ),
    );

    const data = await fetchReviewSession("http://127.0.0.1:8787", "session_123");

    expect(data.cards[0]?.promptPayload.type).toBe("cloze_recall");
    expect(data.cards[0]?.seedId).toBe("seed_123");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/review/sessions/session_123",
      expect.objectContaining({
        credentials: "include",
      }),
    );

    fetchMock.mockRestore();
  });

  it("submits and parses typed recall review answers through the client contract", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            result: {
              cardId: "card_123",
              correct: true,
              expectedText: "pellucid",
              outcome: "correct",
              seedStage: "stabilizing",
              submissionType: "text",
            },
            session: {
              cards: [
                {
                  dimension: "recognition",
                  exerciseType: "cloze_recall",
                  generationSource: "model",
                  id: "card_123",
                  position: 0,
                  promptPayload: {
                    question:
                      "Type the saved word that best completes the blank. Especially clear and easy to follow.",
                    sentence: "Her explanation was ____ even under pressure.",
                    type: "cloze_recall",
                  },
                  seedId: "seed_123",
                  status: "answered",
                },
              ],
              session: {
                cardCount: 1,
                completedAt: "2026-03-26T12:35:10.000Z",
                currentCardId: null,
                id: "session_123",
                remainingCount: 0,
                startedAt: "2026-03-26T12:34:56.000Z",
                status: "completed",
              },
            },
          },
          ok: true,
        }),
        { status: 200 },
      ),
    );

    const data = await submitReviewCard("http://127.0.0.1:8787", {
      cardId: "card_123",
      sessionId: "session_123",
      submission: {
        text: " pellucid ",
        type: "text",
      },
    });

    expect(data.result.submissionType).toBe("text");
    if (data.result.submissionType === "text") {
      expect(data.result.expectedText).toBe("pellucid");
    }
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/review/sessions/session_123/cards/card_123/submit",
      expect.objectContaining({
        body: JSON.stringify({
          text: "pellucid",
          type: "text",
        }),
        method: "POST",
      }),
    );

    fetchMock.mockRestore();
  });
});

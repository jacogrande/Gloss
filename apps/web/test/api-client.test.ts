import { describe, expect, it, vi } from "vitest";

import {
  createSeed,
  fetchSeedDetail,
  fetchSeedList,
  fetchSessionSnapshot,
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
});

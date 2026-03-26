import { describe, expect, it, vi } from "vitest";

import { fetchSessionSnapshot } from "../src/lib/api-client";

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
});

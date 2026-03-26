import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sessionResponseSchema } from "@gloss/shared/contracts";
import { apiErrorResponseSchema } from "@gloss/shared/schemas";

import { createTestContext, extractCookies } from "./helpers";

let context: Awaited<ReturnType<typeof createTestContext>>;

describe("session integration", () => {
  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await context?.database.pool.end();
  });

  it("creates a session through Better Auth and exposes the authenticated profile", async () => {
    const signUpResponse = await context.app.request(
      "http://127.0.0.1:8787/api/auth/sign-up/email",
      {
        body: JSON.stringify({
          email: "reader@example.com",
          name: "Reader",
          password: "password1234",
        }),
        headers: {
          "content-type": "application/json",
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );

    expect(signUpResponse.status).toBe(200);

    const cookieHeader = extractCookies(signUpResponse);
    const meResponse = await context.app.request(
      "http://127.0.0.1:8787/api/me",
      {
        headers: {
          cookie: cookieHeader,
          origin: context.env.WEB_ORIGIN,
        },
      },
    );
    const meBody: unknown = await meResponse.json();
    const parsed = sessionResponseSchema.parse(meBody);

    expect(meResponse.status).toBe(200);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.profile?.userId).toBeTruthy();
    expect(parsed.data.user.email).toBe("reader@example.com");
    expect(parsed.data.user.name).toBe("Reader");
  });

  it("rejects unauthenticated access to the protected route", async () => {
    const response = await context.app.request("http://127.0.0.1:8787/api/me");
    const body: unknown = await response.json();
    const parsed = apiErrorResponseSchema.parse(body);

    expect(response.status).toBe(401);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe("AUTH_UNAUTHORIZED");
  });
});

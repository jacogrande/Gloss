import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sessionResponseSchema } from "@gloss/shared/contracts";
import { apiErrorResponseSchema } from "@gloss/shared/schemas";

import {
  createTestContext,
  extractCookies,
  signInTestUser,
  signUpTestUser,
  signOutTestUser,
} from "./helpers";

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

  it("exposes split-origin CORS headers for Better Auth routes", async () => {
    const response = await context.app.request(
      "http://127.0.0.1:8787/api/auth/sign-in/email",
      {
        headers: {
          "access-control-request-headers": "content-type",
          "access-control-request-method": "POST",
          origin: context.env.WEB_ORIGIN,
        },
        method: "OPTIONS",
      },
    );

    expect(response.headers.get("access-control-allow-origin")).toBe(
      context.env.WEB_ORIGIN,
    );
    expect(response.headers.get("access-control-allow-credentials")).toBe(
      "true",
    );
  });

  it("forces re-auth after sign-out and rejects the stale session cookie", async () => {
    const email = "session-recovery@example.com";
    const firstCookie = await signUpTestUser({
      app: context.app,
      email,
      env: context.env,
      name: "Session Recovery",
    });

    const signOutResponse = await signOutTestUser({
      app: context.app,
      cookie: firstCookie,
      env: context.env,
    });
    const staleSessionResponse = await context.app.request(
      "http://127.0.0.1:8787/api/me",
      {
        headers: {
          cookie: firstCookie,
          origin: context.env.WEB_ORIGIN,
        },
      },
    );
    const staleSessionBody = apiErrorResponseSchema.parse(
      (await staleSessionResponse.json()) as unknown,
    );
    const secondCookie = await signInTestUser({
      app: context.app,
      email,
      env: context.env,
    });
    const recoveredSessionResponse = await context.app.request(
      "http://127.0.0.1:8787/api/me",
      {
        headers: {
          cookie: secondCookie,
          origin: context.env.WEB_ORIGIN,
        },
      },
    );

    expect(signOutResponse.status).toBe(200);
    expect(staleSessionResponse.status).toBe(401);
    expect(staleSessionBody.error.code).toBe("AUTH_UNAUTHORIZED");
    expect(recoveredSessionResponse.status).toBe(200);
    expect(secondCookie).not.toBe(firstCookie);
  });
});

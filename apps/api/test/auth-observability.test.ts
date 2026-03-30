import {
  describe,
  expect,
  it,
} from "vitest";

import {
  extractEmailActorTag,
  hashEmailActorTag,
  resolveAuthFailureErrorCode,
  resolveAuthJourney,
} from "../src/lib/auth-observability";

describe("auth observability helpers", () => {
  it("resolves the expected auth journeys from Better Auth paths", () => {
    expect(resolveAuthJourney("/api/auth/sign-in/email")).toBe("auth.sign_in");
    expect(resolveAuthJourney("/api/auth/sign-up/email")).toBe("auth.sign_up");
    expect(resolveAuthJourney("/api/auth/sign-out")).toBe("auth.sign_out");
    expect(resolveAuthJourney("/api/auth/session")).toBeNull();
  });

  it("hashes email actor tags deterministically", async () => {
    const first = await hashEmailActorTag("Reader@example.com");
    const second = await hashEmailActorTag("reader@example.com");

    expect(first).toMatch(/^email:/);
    expect(first).toBe(second);
    expect(first).not.toContain("reader@example.com");
  });

  it("extracts an email actor tag from a cloned JSON request body", async () => {
    const request = new Request("http://127.0.0.1:8787/api/auth/sign-in/email", {
      body: JSON.stringify({
        email: "reader@example.com",
        password: "password1234",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });

    expect(await extractEmailActorTag(request)).toMatch(/^email:/);
  });

  it("maps auth failures into stable request log error codes", () => {
    expect(
      resolveAuthFailureErrorCode({
        journey: "auth.sign_in",
        status: 401,
      }),
    ).toBe("AUTH_UNAUTHORIZED");
    expect(
      resolveAuthFailureErrorCode({
        journey: "auth.sign_up",
        status: 400,
      }),
    ).toBe("VALIDATION_ERROR");
    expect(
      resolveAuthFailureErrorCode({
        journey: "auth.sign_in",
        status: 500,
      }),
    ).toBe("INTERNAL_ERROR");
  });
});

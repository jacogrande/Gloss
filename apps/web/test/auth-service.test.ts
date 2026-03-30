import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  getAuthErrorMessage,
  signOutCurrentSession,
} from "../src/features/auth/auth-service";
import { ApiClientError } from "../src/lib/http";

vi.mock("../src/lib/env", () => ({
  webEnv: {
    MODE: "test",
    VITE_API_BASE_URL: "http://127.0.0.1:8787",
  },
}));

describe("getAuthErrorMessage", () => {
  it("maps missing-user errors to a stable sign-in message", () => {
    expect(
      getAuthErrorMessage(
        new ApiClientError("INVALID_CREDENTIALS", "User not found"),
      ),
    ).toBe("Incorrect email or password.");
  });

  it("maps invalid password errors to a stable sign-in message", () => {
    expect(
      getAuthErrorMessage(
        new ApiClientError(
          "INVALID_CREDENTIALS",
          "Invalid email or password",
        ),
      ),
    ).toBe("Incorrect email or password.");
  });

  it("sends JSON headers for empty sign-out posts", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
      }),
    );

    await signOutCurrentSession();

    const [url, init] = fetchMock.mock.calls[0] ?? [];

    expect(url).toBe("http://127.0.0.1:8787/api/auth/sign-out");
    expect(init).toMatchObject({
      body: "{}",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });

    fetchMock.mockRestore();
  });
});

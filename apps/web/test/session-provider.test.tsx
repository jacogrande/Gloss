import {
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { SessionData } from "@gloss/shared/types";

import { ApiClientError } from "../src/lib/http";
import {
  SessionProvider,
  useSessionState,
} from "../src/features/auth/session-provider";

const fetchSessionSnapshot = vi.fn();

vi.mock("../src/lib/api-client", () => ({
  fetchSessionSnapshot: (...args: unknown[]) => fetchSessionSnapshot(...args),
}));

vi.mock("../src/lib/env", () => ({
  webEnv: {
    MODE: "test",
    VITE_API_BASE_URL: "http://127.0.0.1:8787",
  },
}));

const storedSessionKey = "gloss.session";

const sessionFixture: SessionData = {
  profile: {
    createdAt: "2026-03-28T16:00:00.000Z",
    updatedAt: "2026-03-28T16:00:00.000Z",
    userId: "user_123",
  },
  session: {
    expiresAt: "2026-03-28T17:00:00.000Z",
    id: "session_123",
    userId: "user_123",
  },
  user: {
    email: "reader@example.com",
    id: "user_123",
    image: null,
    name: "Reader",
  },
};

const Probe = () => {
  const session = useSessionState();

  return (
    <div>
      <p>{session.status}</p>
      <p>{session.session?.user.email ?? "no-session"}</p>
    </div>
  );
};

describe("SessionProvider", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    fetchSessionSnapshot.mockReset();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("keeps the last known session during transient refresh failures", async () => {
    window.sessionStorage.setItem(storedSessionKey, JSON.stringify(sessionFixture));
    fetchSessionSnapshot.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );

    expect(screen.getByText("authenticated")).toBeVisible();
    expect(screen.getByText("reader@example.com")).toBeVisible();

    await waitFor(() => {
      expect(fetchSessionSnapshot).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("authenticated")).toBeVisible();
    expect(screen.getByText("reader@example.com")).toBeVisible();
  });

  it("clears the cached session on unauthorized responses", async () => {
    window.sessionStorage.setItem(storedSessionKey, JSON.stringify(sessionFixture));
    fetchSessionSnapshot.mockRejectedValueOnce(
      new ApiClientError(
        "AUTH_UNAUTHORIZED",
        "Authentication is required to access this resource.",
      ),
    );

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("anonymous")).toBeVisible();
    });

    expect(screen.getByText("no-session")).toBeVisible();
    expect(window.sessionStorage.getItem(storedSessionKey)).toBeNull();
  });
});

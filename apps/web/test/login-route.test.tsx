import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  MemoryRouter,
  Route,
  Routes,
} from "react-router-dom";

import type {
  SessionData,
} from "@gloss/shared/types";

import type {
  signInWithPassword as signInWithPasswordType,
  signUpWithPassword as signUpWithPasswordType,
} from "../src/features/auth/auth-service";
import { LoginRoute } from "../src/routes/login-route";

const {
  refreshSession,
  sessionState,
  signInWithPassword,
  signUpWithPassword,
} = vi.hoisted(() => ({
  refreshSession: vi.fn(),
  sessionState: {
    refreshSession: vi.fn(),
    session: null as SessionData | null,
    setSession: vi.fn(),
    status: "anonymous" as "anonymous" | "authenticated" | "loading",
  },
  signInWithPassword: vi.fn<typeof signInWithPasswordType>(),
  signUpWithPassword: vi.fn<typeof signUpWithPasswordType>(),
}));

vi.mock("../src/features/auth/auth-service", () => ({
  getAuthErrorMessage: () => "Auth failed.",
  signInWithPassword,
  signUpWithPassword,
}));

vi.mock("../src/features/auth/session-provider", () => ({
  useSessionState: () => sessionState,
}));

describe("LoginRoute", () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
    window.sessionStorage.clear();
    sessionState.refreshSession = refreshSession;
    sessionState.session = null;
    sessionState.setSession = vi.fn();
    sessionState.status = "anonymous";
  });

  it("routes sign-up users into capture", async () => {
    signUpWithPassword.mockResolvedValue(undefined);
    refreshSession.mockResolvedValue(null);
    sessionState.refreshSession = refreshSession;

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<LoginRoute />} path="/login" />
          <Route element={<p>Capture page</p>} path="/capture" />
          <Route element={<p>Library page</p>} path="/library" />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(
      within(screen.getByRole("tablist", { name: "Auth mode" })).getByRole("button", {
        name: "Create account",
      }),
    );
    await userEvent.type(screen.getByRole("textbox", { name: /^Name/ }), "Review User");
    await userEvent.type(screen.getByRole("textbox", { name: /^Email/ }), "review@example.com");
    await userEvent.type(screen.getByPlaceholderText("At least 8 characters"), "password1234");
    await userEvent.click(within(screen.getByTestId("auth-form")).getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(screen.getByText("Capture page")).toBeVisible();
    });

    expect(signUpWithPassword).toHaveBeenCalledTimes(1);
  });

  it("redirects authenticated users to capture while onboarding is still pending", async () => {
    window.sessionStorage.setItem("gloss.capture_onboarding_pending", "true");
    sessionState.session = {
      profile: null,
      session: {
        expiresAt: "2026-04-01T00:00:00.000Z",
        id: "session_1",
        userId: "user_1",
      },
      user: {
        email: "reader@example.com",
        id: "user_1",
        image: null,
        name: "Reader",
      },
    };
    sessionState.status = "authenticated";

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<LoginRoute />} path="/login" />
          <Route element={<p>Capture page</p>} path="/capture" />
          <Route element={<p>Library page</p>} path="/library" />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Capture page")).toBeVisible();
    });
  });
});

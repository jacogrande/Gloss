import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { JSX } from "react";
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
  useLocation,
} from "react-router-dom";

import { ProtectedLayout } from "../src/routes/protected-layout";

const signOutCurrentSession = vi.fn<() => Promise<void>>();
const sessionState = {
  connectionMessage: null as string | null,
  connectionStatus: "online" as "online" | "reconnecting" | "unavailable",
  refreshSession: vi.fn(),
  session: {
    user: {
      email: "reader@example.com",
      name: "Reader",
    },
  } as
    | {
        user: {
          email: string;
          name: string;
        };
      }
    | null,
  setSession: vi.fn<(value: null) => void>(),
  status: "authenticated" as "anonymous" | "authenticated" | "loading",
};

vi.mock("../src/features/auth/session-provider", () => ({
  useSessionState: () => sessionState,
}));

vi.mock("../src/features/auth/auth-service", () => ({
  getAuthErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : "Unable to sign out.",
  signOutCurrentSession: (): Promise<void> => signOutCurrentSession(),
}));

describe("ProtectedLayout", () => {
  afterEach(() => {
    sessionState.connectionMessage = null;
    sessionState.connectionStatus = "online";
    sessionState.session = {
      user: {
        email: "reader@example.com",
        name: "Reader",
      },
    };
    sessionState.status = "authenticated";
  });

  const LoginProbe = (): JSX.Element => {
    const location = useLocation();

    return <div>Login screen {location.search}</div>;
  };

  it("surfaces sign-out failures instead of leaving an unhandled rejection", async () => {
    signOutCurrentSession.mockRejectedValueOnce(new Error("Unable to sign out."));
    sessionState.session = {
      user: {
        email: "reader@example.com",
        name: "Reader",
      },
    };
    sessionState.status = "authenticated";

    render(
      <MemoryRouter initialEntries={["/library"]}>
        <Routes>
          <Route element={<ProtectedLayout />}>
            <Route element={<div>Library body</div>} path="/library" />
          </Route>
          <Route element={<div>Login screen</div>} path="/login" />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByText("Unable to sign out.")).toBeVisible();
    expect(screen.getByText("Library body")).toBeVisible();
  });

  it("preserves the requested route when redirecting anonymous users to login", async () => {
    sessionState.session = null;
    sessionState.status = "anonymous";

    render(
      <MemoryRouter initialEntries={["/seeds/seed_1?from=library"]}>
        <Routes>
          <Route element={<ProtectedLayout />}>
            <Route element={<div>Seed body</div>} path="/seeds/:seedId" />
          </Route>
          <Route element={<LoginProbe />} path="/login" />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(
        "Login screen ?returnTo=%2Fseeds%2Fseed_1%3Ffrom%3Dlibrary",
      ),
    ).toBeVisible();
  });

  it("shows a reconnecting banner while using a cached session", () => {
    sessionState.session = {
      user: {
        email: "reader@example.com",
        name: "Reader",
      },
    };
    sessionState.status = "authenticated";
    sessionState.connectionStatus = "reconnecting";
    sessionState.connectionMessage =
      "Gloss is reconnecting. Showing your last saved session for now.";

    render(
      <MemoryRouter initialEntries={["/library"]}>
        <Routes>
          <Route element={<ProtectedLayout />}>
            <Route element={<div>Library body</div>} path="/library" />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Gloss is reconnecting. Showing your last saved session for now."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Retry now" })).toBeVisible();
  });
});

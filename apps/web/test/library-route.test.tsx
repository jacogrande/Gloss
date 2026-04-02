import {
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { JSX } from "react";
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
  useLocation,
} from "react-router-dom";

import type {
  fetchSeedList as fetchSeedListType,
} from "../src/lib/api-client";
import { ApiClientError } from "../src/lib/http";
import { LibraryRoute } from "../src/routes/library-route";

const {
  fetchSeedList,
  sessionState,
} = vi.hoisted(() => ({
  fetchSeedList: vi.fn<typeof fetchSeedListType>(),
  sessionState: {
    refreshSession: vi.fn(),
    session: {
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
    },
    setSession: vi.fn(),
    status: "authenticated" as const,
  },
}));

vi.mock("../src/lib/api-client", () => ({
  fetchSeedList,
}));

vi.mock("../src/features/auth/session-provider", () => ({
  useSessionState: () => sessionState,
}));

vi.mock("../src/lib/env", () => ({
  webEnv: {
    MODE: "test",
    VITE_API_BASE_URL: "http://127.0.0.1:8787",
  },
}));

describe("LibraryRoute", () => {
  const LoginProbe = (): JSX.Element => {
    const location = useLocation();

    return <p>{`Login ${location.search}`}</p>;
  };

  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
    sessionState.setSession = vi.fn();
  });

  it("shows a capture CTA when the library is truly empty", async () => {
    fetchSeedList.mockResolvedValue({
      items: [],
      total: 0,
    });

    render(
      <MemoryRouter initialEntries={["/library"]}>
        <Routes>
          <Route element={<LibraryRoute />} path="/library" />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "No words yet." })).toBeVisible();
    expect(
      screen.getByText(/Save your first word from real reading\./i),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Save your first word" })).toHaveAttribute(
      "href",
      "/capture",
    );
    expect(screen.queryByLabelText("Stage")).toBeNull();
    expect(screen.queryByText("0 word(s)")).toBeNull();
  });

  it("shows a clear-filter action for an empty filtered view", async () => {
    const savedSeed = {
      createdAt: "2026-03-31T00:00:00.000Z",
      id: "seed_1",
      primarySentence: "The explanation was pellucid.",
      source: null,
      stage: "new" as const,
      updatedAt: "2026-03-31T00:00:00.000Z",
      word: "pellucid",
    };

    fetchSeedList
      .mockResolvedValueOnce({
        items: [savedSeed],
        total: 1,
      })
      .mockResolvedValueOnce({
        items: [],
        total: 0,
      })
      .mockResolvedValueOnce({
        items: [savedSeed],
        total: 1,
      })
      .mockResolvedValueOnce({
        items: [savedSeed],
        total: 1,
      });

    render(
      <MemoryRouter initialEntries={["/library"]}>
        <Routes>
          <Route element={<LibraryRoute />} path="/library" />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole("link", { name: "pellucid" });

    await userEvent.selectOptions(screen.getAllByLabelText("Stage")[0]!, "mature");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "No mature words." })).toBeVisible();
    });

    await userEvent.click(screen.getByRole("button", { name: "Clear filter" }));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "pellucid" })).toBeVisible();
    });
  });

  it("redirects unauthorized library loads through login with returnTo", async () => {
    fetchSeedList.mockRejectedValue(
      new ApiClientError("AUTH_UNAUTHORIZED", "Session expired."),
    );

    render(
      <MemoryRouter initialEntries={["/library"]}>
        <Routes>
          <Route element={<LibraryRoute />} path="/library" />
          <Route element={<LoginProbe />} path="/login" />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Login ?returnTo=%2Flibrary")).toBeVisible();
    });

    expect(sessionState.setSession).toHaveBeenCalledWith(null);
  });

  it("keeps the current library visible when a manual refresh fails", async () => {
    fetchSeedList
      .mockResolvedValueOnce({
        items: [
          {
            createdAt: "2026-03-31T00:00:00.000Z",
            id: "seed_1",
            primarySentence: "The explanation was pellucid.",
            source: null,
            stage: "new",
            updatedAt: "2026-03-31T00:00:00.000Z",
            word: "pellucid",
          },
        ],
        total: 1,
      })
      .mockRejectedValueOnce(new Error("Library refresh failed."));

    render(
      <MemoryRouter initialEntries={["/library"]}>
        <Routes>
          <Route element={<LibraryRoute />} path="/library" />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("link", { name: "pellucid" })).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Library refresh failed.");
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Showing the last loaded library for now.",
    );
    expect(screen.getByRole("link", { name: "pellucid" })).toBeVisible();
  });

  it("shows a blocking error instead of stale words when a filter change fails", async () => {
    fetchSeedList
      .mockResolvedValueOnce({
        items: [
          {
            createdAt: "2026-03-31T00:00:00.000Z",
            id: "seed_1",
            primarySentence: "The explanation was pellucid.",
            source: null,
            stage: "new",
            updatedAt: "2026-03-31T00:00:00.000Z",
            word: "pellucid",
          },
        ],
        total: 1,
      })
      .mockRejectedValueOnce(new Error("Filtered library unavailable."));

    render(
      <MemoryRouter initialEntries={["/library"]}>
        <Routes>
          <Route element={<LibraryRoute />} path="/library" />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("link", { name: "pellucid" })).toBeVisible();

    await userEvent.selectOptions(screen.getAllByLabelText("Stage")[0]!, "mature");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Filtered library unavailable.");
    });

    expect(screen.queryByRole("link", { name: "pellucid" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
  });
});

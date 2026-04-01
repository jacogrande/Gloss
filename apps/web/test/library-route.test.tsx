import {
  cleanup,
  render,
  screen,
  waitFor,
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
  fetchSeedList as fetchSeedListType,
} from "../src/lib/api-client";
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
    expect(screen.getByRole("link", { name: "Capture your first word" })).toHaveAttribute(
      "href",
      "/capture",
    );
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
});

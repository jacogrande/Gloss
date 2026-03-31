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
  ReviewQueueSummary,
  ReviewSessionDetail,
} from "@gloss/shared/types";

import type {
  fetchReviewQueue as fetchReviewQueueType,
  fetchReviewSession as fetchReviewSessionType,
  startReviewSession as startReviewSessionType,
  submitReviewCard as submitReviewCardType,
} from "../src/lib/api-client";
import { ApiClientError } from "../src/lib/http";
import { ReviewRoute } from "../src/routes/review-route";

const {
  fetchReviewQueue,
  fetchReviewSession,
  startReviewSession,
  submitReviewCard,
  setSession,
} = vi.hoisted(() => ({
  fetchReviewQueue: vi.fn<typeof fetchReviewQueueType>(),
  fetchReviewSession: vi.fn<typeof fetchReviewSessionType>(),
  setSession: vi.fn(),
  startReviewSession: vi.fn<typeof startReviewSessionType>(),
  submitReviewCard: vi.fn<typeof submitReviewCardType>(),
}));

vi.mock("../src/lib/api-client", () => ({
  fetchReviewQueue,
  fetchReviewSession,
  startReviewSession,
  submitReviewCard,
}));

vi.mock("../src/lib/env", () => ({
  webEnv: {
    MODE: "test",
    VITE_API_BASE_URL: "http://127.0.0.1:8787",
  },
}));

vi.mock("../src/features/auth/session-provider", () => ({
  useSessionState: () => ({
    refreshSession: vi.fn(),
    session: null,
    setSession,
    status: "authenticated",
  }),
}));

const createQueue = (
  overrides: Partial<ReviewQueueSummary> = {},
): ReviewQueueSummary => ({
  activeSessionId: null,
  availableCount: 1,
  capturedCount: 1,
  dueByDimension: {
    distinction: 1,
    recognition: 1,
    usage: 1,
  },
  dueCount: 1,
  ...overrides,
});

const createActiveSession = (): ReviewSessionDetail => ({
  cards: [
    {
      dimension: "recognition",
      exerciseType: "meaning_in_context",
      generationSource: "template",
      id: "card_1",
      position: 0,
      promptPayload: {
        choices: [
          {
            id: "choice_1",
            label: "Especially clear and easy to follow.",
          },
          {
            id: "choice_2",
            label: "Mostly careless and imprecise.",
          },
          {
            id: "choice_3",
            label: "Mainly casual or unserious.",
          },
        ],
        question: "What does pellucid mean here?",
        sentence: "Her explanation was pellucid even under pressure.",
        type: "meaning_in_context",
        word: "pellucid",
      },
      status: "pending",
    },
  ],
  session: {
    cardCount: 1,
    completedAt: null,
    currentCardId: "card_1",
    id: "session_1",
    remainingCount: 1,
    startedAt: "2026-03-29T00:00:00.000Z",
    status: "active",
  },
});

const createAdvancedSession = (): ReviewSessionDetail => ({
  cards: [
    {
      dimension: "recognition",
      exerciseType: "meaning_in_context",
      generationSource: "template",
      id: "card_1",
      position: 0,
      promptPayload: {
        choices: [
          {
            id: "choice_1",
            label: "Especially clear and easy to follow.",
          },
          {
            id: "choice_2",
            label: "Mostly careless and imprecise.",
          },
          {
            id: "choice_3",
            label: "Mainly casual or unserious.",
          },
        ],
        question: "What does pellucid mean here?",
        sentence: "Her explanation was pellucid even under pressure.",
        type: "meaning_in_context",
        word: "pellucid",
      },
      status: "answered",
    },
    {
      dimension: "distinction",
      exerciseType: "contrastive_choice",
      generationSource: "template",
      id: "card_2",
      position: 1,
      promptPayload: {
        choices: [
          {
            id: "choice_4",
            label: "verbose",
          },
          {
            id: "choice_5",
            label: "lucid",
          },
          {
            id: "choice_6",
            label: "casual",
          },
        ],
        question: "Which contrast best fits pellucid here?",
        sentence: "Her explanation was pellucid even under pressure.",
        type: "contrastive_choice",
        word: "pellucid",
      },
      status: "pending",
    },
  ],
  session: {
    cardCount: 2,
    completedAt: null,
    currentCardId: "card_2",
    id: "session_1",
    remainingCount: 1,
    startedAt: "2026-03-29T00:00:00.000Z",
    status: "active",
  },
});

describe("ReviewRoute", () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it("starts and completes a short review session", async () => {
    const activeSession = createActiveSession();
    const activeCard = activeSession.cards[0]!;

    fetchReviewQueue.mockImplementation(() => Promise.resolve(createQueue()));
    startReviewSession.mockResolvedValue(activeSession);
    submitReviewCard.mockResolvedValue({
      result: {
        cardId: "card_1",
        correct: true,
        outcome: "correct",
        seedStage: "stabilizing",
      },
      session: {
        cards: [
          {
            ...activeCard,
            status: "answered",
          },
        ],
        session: {
          ...activeSession.session,
          completedAt: "2026-03-29T00:00:05.000Z",
          currentCardId: null,
          remainingCount: 0,
          status: "completed",
        },
      },
    });

    render(
      <MemoryRouter initialEntries={["/review"]}>
        <Routes>
          <Route element={<ReviewRoute />} path="/review" />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Review" })).toBeVisible();
    expect(screen.getByText("1 due")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Start review" }));

    expect(await screen.findByRole("heading", { name: "pellucid" })).toBeVisible();
    await userEvent.click(
      screen.getByRole("radio", {
        name: /Especially clear and easy to follow/i,
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(screen.getByText("Session finished")).toBeVisible();
    });

    expect(submitReviewCard).toHaveBeenCalledTimes(1);
    expect(fetchReviewQueue).toHaveBeenCalled();
  });

  it("refreshes the session after a stale-card conflict", async () => {
    const activeSession = createActiveSession();
    const advancedSession = createAdvancedSession();

    fetchReviewQueue.mockImplementation(() => Promise.resolve(createQueue()));
    startReviewSession.mockResolvedValue(activeSession);
    submitReviewCard.mockRejectedValueOnce(
      new ApiClientError(
        "REVIEW_CONFLICT",
        "Review card has already been answered.",
      ),
    );
    fetchReviewSession.mockResolvedValueOnce(advancedSession);

    render(
      <MemoryRouter initialEntries={["/review"]}>
        <Routes>
          <Route element={<ReviewRoute />} path="/review" />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { name: "Review" });
    await userEvent.click(screen.getByRole("button", { name: "Start review" }));
    await screen.findByRole("heading", { name: "pellucid" });

    await userEvent.click(
      screen.getByRole("radio", {
        name: /Especially clear and easy to follow/i,
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeVisible();
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This review changed elsewhere. The latest card is shown here.",
    );
    expect(fetchReviewSession).toHaveBeenCalledWith(
      "http://127.0.0.1:8787",
      "session_1",
    );
    expect(
      screen.getByRole("radio", {
        name: /verbose/i,
      }),
    ).toBeVisible();
  });

  it("shows a capture CTA instead of a dead-end button when nothing is reviewable", async () => {
    fetchReviewQueue.mockResolvedValue({
      activeSessionId: null,
      availableCount: 0,
      capturedCount: 0,
      dueByDimension: {
        distinction: 0,
        recognition: 0,
        usage: 0,
      },
      dueCount: 0,
    });

    render(
      <MemoryRouter initialEntries={["/review"]}>
        <Routes>
          <Route element={<ReviewRoute />} path="/review" />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Review" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /start review|resume session/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Capture your first word" })).toHaveAttribute(
      "href",
      "/capture",
    );
  });

  it("does not offer a start button when nothing is due yet", async () => {
    fetchReviewQueue.mockResolvedValue({
      activeSessionId: null,
      availableCount: 3,
      capturedCount: 3,
      dueByDimension: {
        distinction: 0,
        recognition: 0,
        usage: 0,
      },
      dueCount: 0,
    });

    render(
      <MemoryRouter initialEntries={["/review"]}>
        <Routes>
          <Route element={<ReviewRoute />} path="/review" />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Review" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /start review|resume session/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse your words" })).toHaveAttribute(
      "href",
      "/library",
    );
  });

  it("explains when words exist but none are ready to review yet", async () => {
    fetchReviewQueue.mockResolvedValue(
      createQueue({
        availableCount: 0,
        capturedCount: 2,
        dueByDimension: {
          distinction: 0,
          recognition: 0,
          usage: 0,
        },
        dueCount: 0,
      }),
    );

    render(
      <MemoryRouter initialEntries={["/review"]}>
        <Routes>
          <Route element={<ReviewRoute />} path="/review" />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Review" })).toBeVisible();
    expect(
      screen.getByText("Nothing is ready to review yet. Give your saved words a moment, or browse your library in the meantime."),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Browse your words" })).toHaveAttribute(
      "href",
      "/library",
    );
  });

  it("shows a load error instead of the empty queue copy when queue fetch fails", async () => {
    fetchReviewQueue.mockRejectedValue(new Error("Queue offline."));

    render(
      <MemoryRouter initialEntries={["/review"]}>
        <Routes>
          <Route element={<ReviewRoute />} path="/review" />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Review" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Queue offline.");
    expect(
      screen.queryByRole("link", { name: "Capture your first word" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse your words" })).toHaveAttribute(
      "href",
      "/library",
    );
  });
});

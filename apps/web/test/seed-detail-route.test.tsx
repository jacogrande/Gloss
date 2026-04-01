import {
  cleanup,
  render,
  screen,
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

import type { SeedDetail } from "@gloss/shared/types";

import type {
  fetchSeedDetail as fetchSeedDetailType,
  requestSeedEnrichment as requestSeedEnrichmentType,
  updateSeed as updateSeedType,
} from "../src/lib/api-client";
import { SeedDetailRoute } from "../src/routes/seed-detail-route";

const {
  fetchSeedDetail,
  requestSeedEnrichment,
  updateSeed,
} = vi.hoisted(() => ({
  fetchSeedDetail: vi.fn<typeof fetchSeedDetailType>(),
  requestSeedEnrichment: vi.fn<typeof requestSeedEnrichmentType>(),
  updateSeed: vi.fn<typeof updateSeedType>(),
}));

vi.mock("../src/lib/api-client", () => ({
  fetchSeedDetail,
  requestSeedEnrichment,
  updateSeed,
}));

vi.mock("../src/lib/env", () => ({
  webEnv: {
    MODE: "test",
    VITE_API_BASE_URL: "http://127.0.0.1:8787",
  },
}));

const createSeedDetail = (
  enrichment: SeedDetail["enrichment"],
  overrides?: Partial<SeedDetail>,
): SeedDetail => ({
  contexts: [
    {
      createdAt: "2026-03-26T00:00:00.000Z",
      id: "context_1",
      isPrimary: true,
      kind: "sentence",
      text: "Her explanation was pellucid even under pressure.",
    },
  ],
  createdAt: "2026-03-26T00:00:00.000Z",
  enrichment,
  id: "seed_1",
  primarySentence: "Her explanation was pellucid even under pressure.",
  source: {
    author: "A. Reader",
    id: "source_1",
    kind: "book",
    title: "On Style",
    url: null,
  },
  stage: "new",
  updatedAt: "2026-03-26T00:00:00.000Z",
  word: "pellucid",
  ...overrides,
});

const createDeferred = <TValue,>(): {
  promise: Promise<TValue>;
  reject: (reason?: unknown) => void;
  resolve: (value: TValue | PromiseLike<TValue>) => void;
} => {
  let resolve!: (value: TValue | PromiseLike<TValue>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<TValue>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    promise,
    reject,
    resolve,
  };
};

const flushPromises = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("SeedDetailRoute", () => {
  afterEach(() => {
    vi.resetAllMocks();
    cleanup();
  });

  it("renders the initial seed handoff immediately after capture", async () => {
    const deferredSeed = createDeferred<SeedDetail>();

    fetchSeedDetail.mockReturnValueOnce(deferredSeed.promise);

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/seeds/seed_1",
            state: {
              initialSeed: createSeedDetail(null, {
                contexts: [],
                primarySentence: null,
                source: null,
              }),
              showSavedNotice: true,
            },
          },
        ]}
      >
        <Routes>
          <Route element={<SeedDetailRoute />} path="/seeds/:seedId" />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "pellucid" })).toBeVisible();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    expect(screen.getByText("Saved")).toBeVisible();

    deferredSeed.resolve(
      createSeedDetail({
        completedAt: null,
        createdAt: "2026-03-26T00:00:00.000Z",
        errorCode: null,
        failedAt: null,
        guardrailFlags: [],
        id: "enrichment_1",
        model: "fixture-model",
        payload: null,
        promptTemplateVersion: "seed-enrichment.v1",
        provider: "fixture",
        requestedAt: "2026-03-26T00:00:00.000Z",
        schemaVersion: "seed-enrichment-payload.v1",
        startedAt: "2026-03-26T00:00:00.000Z",
        status: "pending",
        updatedAt: "2026-03-26T00:00:00.000Z",
      }),
    );
    await flushPromises();

    expect(screen.getByText("Definition")).toBeVisible();
  });

  it("polls seed detail while enrichment remains pending", async () => {
    fetchSeedDetail
      .mockResolvedValueOnce(createSeedDetail(null))
      .mockResolvedValueOnce(
        createSeedDetail({
          completedAt: "2026-03-26T00:00:02.000Z",
          createdAt: "2026-03-26T00:00:00.000Z",
          errorCode: null,
          failedAt: null,
          guardrailFlags: [],
          id: "enrichment_1",
          model: "fixture-model",
          payload: {
            contrastiveWord: {
              note: "Opaque language hides the clarity that pellucid language keeps visible.",
              word: "opaque",
            },
            gloss:
              "In this sentence, it means the explanation was especially clear and easy to follow.",
            morphologyNote: {
              note: "The root is associated with brightness and clarity.",
            },
            registerNote:
              "It is more formal and literary than everyday words like clear.",
            relatedWord: {
              note: "Lucid is close in meaning, but pellucid sounds slightly more elevated.",
              word: "lucid",
            },
          },
          promptTemplateVersion: "seed-enrichment.v1",
          provider: "fixture",
          requestedAt: "2026-03-26T00:00:00.000Z",
          schemaVersion: "seed-enrichment-payload.v1",
          startedAt: null,
          status: "ready",
          updatedAt: "2026-03-26T00:00:02.000Z",
        }),
      );
    requestSeedEnrichment.mockResolvedValue({
      completedAt: null,
      createdAt: "2026-03-26T00:00:00.000Z",
      errorCode: null,
      failedAt: null,
      guardrailFlags: [],
      id: "enrichment_1",
      model: "fixture-model",
      payload: null,
      promptTemplateVersion: "seed-enrichment.v1",
      provider: "fixture",
      requestedAt: "2026-03-26T00:00:00.000Z",
      schemaVersion: "seed-enrichment-payload.v1",
      startedAt: "2026-03-26T00:00:00.000Z",
      status: "pending",
      updatedAt: "2026-03-26T00:00:00.000Z",
    });

    render(
      <MemoryRouter initialEntries={["/seeds/seed_1"]}>
        <Routes>
          <Route element={<SeedDetailRoute />} path="/seeds/:seedId" />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "pellucid" }),
    ).toBeVisible();

    await new Promise((resolve) => {
      window.setTimeout(resolve, 1_600);
    });
    await flushPromises();

    expect(requestSeedEnrichment).toHaveBeenCalledTimes(1);
    expect(fetchSeedDetail).toHaveBeenCalledTimes(2);
    expect(
      screen.getByText(
        "The explanation was especially clear and easy to follow.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Context")).toBeVisible();
    expect(screen.getByText("In context")).toBeVisible();
    expect(screen.getByText("Compare")).toBeVisible();
    expect(screen.getByText("Similar")).toBeVisible();
    expect(screen.getByRole("link", { name: "Review queue" })).toHaveAttribute(
      "href",
      "/review",
    );
    expect(screen.getByText("lucid")).toBeVisible();
    expect(screen.getByText("Roots")).toBeVisible();
  });

  it("shows a save notice and lets thin-context seeds add recovery context", async () => {
    fetchSeedDetail.mockResolvedValueOnce(
      createSeedDetail(
        {
          completedAt: null,
          createdAt: "2026-03-26T00:00:00.000Z",
          errorCode: "ENRICHMENT_EVIDENCE_UNAVAILABLE",
          failedAt: "2026-03-26T00:00:02.000Z",
          guardrailFlags: [],
          id: "enrichment_2",
          model: "fixture-model",
          payload: null,
          promptTemplateVersion: "seed-enrichment.v1",
          provider: "fixture",
          requestedAt: "2026-03-26T00:00:00.000Z",
          schemaVersion: "seed-enrichment-payload.v1",
          startedAt: null,
          status: "failed",
          updatedAt: "2026-03-26T00:00:02.000Z",
        },
        {
          contexts: [],
          primarySentence: null,
          source: null,
        },
      ),
    );
    updateSeed.mockResolvedValue(
      createSeedDetail(
        {
          completedAt: null,
          createdAt: "2026-03-26T00:00:00.000Z",
          errorCode: "ENRICHMENT_EVIDENCE_UNAVAILABLE",
          failedAt: "2026-03-26T00:00:02.000Z",
          guardrailFlags: [],
          id: "enrichment_2",
          model: "fixture-model",
          payload: null,
          promptTemplateVersion: "seed-enrichment.v1",
          provider: "fixture",
          requestedAt: "2026-03-26T00:00:00.000Z",
          schemaVersion: "seed-enrichment-payload.v1",
          startedAt: null,
          status: "failed",
          updatedAt: "2026-03-26T00:00:02.000Z",
        },
        {
          contexts: [
            {
              createdAt: "2026-03-26T00:00:00.000Z",
              id: "context_2",
              isPrimary: true,
              kind: "sentence",
              text: "Her reply was pellucid even under pressure.",
            },
          ],
          primarySentence: "Her reply was pellucid even under pressure.",
          source: null,
        },
      ),
    );
    requestSeedEnrichment.mockResolvedValue({
      completedAt: null,
      createdAt: "2026-03-26T00:00:00.000Z",
      errorCode: null,
      failedAt: null,
      guardrailFlags: [],
      id: "enrichment_2",
      model: "fixture-model",
      payload: null,
      promptTemplateVersion: "seed-enrichment.v1",
      provider: "fixture",
      requestedAt: "2026-03-26T00:00:00.000Z",
      schemaVersion: "seed-enrichment-payload.v1",
      startedAt: "2026-03-26T00:00:03.000Z",
      status: "pending",
      updatedAt: "2026-03-26T00:00:03.000Z",
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/seeds/seed_1",
            state: {
              initialSeed: createSeedDetail(
                {
                  completedAt: null,
                  createdAt: "2026-03-26T00:00:00.000Z",
                  errorCode: "ENRICHMENT_EVIDENCE_UNAVAILABLE",
                  failedAt: "2026-03-26T00:00:02.000Z",
                  guardrailFlags: [],
                  id: "enrichment_2",
                  model: "fixture-model",
                  payload: null,
                  promptTemplateVersion: "seed-enrichment.v1",
                  provider: "fixture",
                  requestedAt: "2026-03-26T00:00:00.000Z",
                  schemaVersion: "seed-enrichment-payload.v1",
                  startedAt: null,
                  status: "failed",
                  updatedAt: "2026-03-26T00:00:02.000Z",
                },
                {
                  contexts: [],
                  primarySentence: null,
                  source: null,
                },
              ),
              showSavedNotice: true,
            },
          },
        ]}
      >
        <Routes>
          <Route element={<SeedDetailRoute />} path="/seeds/:seedId" />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "Add context" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Add a sentence or source details, then try enrichment again.",
      ),
    ).toBeVisible();

    await userEvent.type(
      screen.getByRole("textbox", { name: "Sentence (optional)" }),
      "Her reply was pellucid even under pressure.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save context" }));

    expect(updateSeed).toHaveBeenCalledWith(
      "http://127.0.0.1:8787",
      "seed_1",
      {
        sentence: "Her reply was pellucid even under pressure.",
      },
    );
    expect(requestSeedEnrichment).toHaveBeenCalledTimes(1);
  });

  it("forces a fresh enrichment when a ready seed gains its first sentence", async () => {
    const readySourceOnlySeed = createSeedDetail(
      {
        completedAt: "2026-03-26T00:00:02.000Z",
        createdAt: "2026-03-26T00:00:00.000Z",
        errorCode: null,
        failedAt: null,
        guardrailFlags: [],
        id: "enrichment_3",
        model: "fixture-model",
        payload: {
          gloss: "Especially clear and easy to follow.",
        },
        promptTemplateVersion: "seed-enrichment.v1",
        provider: "fixture",
        requestedAt: "2026-03-26T00:00:00.000Z",
        schemaVersion: "seed-enrichment-payload.v1",
        startedAt: null,
        status: "ready",
        updatedAt: "2026-03-26T00:00:02.000Z",
      },
      {
        contexts: [],
        primarySentence: null,
        source: {
          author: "A. Reader",
          id: "source_1",
          kind: "book",
          title: "On Style",
          url: null,
        },
      },
    );

    fetchSeedDetail.mockResolvedValueOnce(readySourceOnlySeed);
    updateSeed.mockResolvedValue({
      ...readySourceOnlySeed,
      contexts: [
        {
          createdAt: "2026-03-26T00:00:03.000Z",
          id: "context_3",
          isPrimary: true,
          kind: "sentence",
          text: "Her reply was pellucid even under pressure.",
        },
      ],
      primarySentence: "Her reply was pellucid even under pressure.",
    });
    requestSeedEnrichment.mockResolvedValue({
      completedAt: null,
      createdAt: "2026-03-26T00:00:00.000Z",
      errorCode: null,
      failedAt: null,
      guardrailFlags: [],
      id: "enrichment_3",
      model: "fixture-model",
      payload: null,
      promptTemplateVersion: "seed-enrichment.v1",
      provider: "fixture",
      requestedAt: "2026-03-26T00:00:03.000Z",
      schemaVersion: "seed-enrichment-payload.v1",
      startedAt: "2026-03-26T00:00:03.000Z",
      status: "pending",
      updatedAt: "2026-03-26T00:00:03.000Z",
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/seeds/seed_1",
            state: {
              initialSeed: readySourceOnlySeed,
              showSavedNotice: true,
            },
          },
        ]}
      >
        <Routes>
          <Route element={<SeedDetailRoute />} path="/seeds/:seedId" />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("link", { name: "Review queue" })).toHaveAttribute(
      "href",
      "/review",
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: "Sentence (optional)" }),
      "Her reply was pellucid even under pressure.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save context" }));

    expect(requestSeedEnrichment).toHaveBeenCalledWith(
      "http://127.0.0.1:8787",
      "seed_1",
      {
        force: true,
      },
    );
  });
});

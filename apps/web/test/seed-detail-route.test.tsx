import {
  render,
  screen,
} from "@testing-library/react";
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
} from "../src/lib/api-client";
import { SeedDetailRoute } from "../src/routes/seed-detail-route";

const {
  fetchSeedDetail,
  requestSeedEnrichment,
} = vi.hoisted(() => ({
  fetchSeedDetail: vi.fn<typeof fetchSeedDetailType>(),
  requestSeedEnrichment: vi.fn<typeof requestSeedEnrichmentType>(),
}));

vi.mock("../src/lib/api-client", () => ({
  fetchSeedDetail,
  requestSeedEnrichment,
}));

vi.mock("../src/lib/env", () => ({
  webEnv: {
    MODE: "test",
    VITE_API_BASE_URL: "http://127.0.0.1:8787",
  },
}));

const createSeedDetail = (
  enrichment: SeedDetail["enrichment"],
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
});

const flushPromises = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("SeedDetailRoute", () => {
  afterEach(() => {
    vi.resetAllMocks();
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
    expect(screen.getByText("Example")).toBeVisible();
    expect(screen.getByText("Meaning here")).toBeVisible();
    expect(screen.getByText("Compare")).toBeVisible();
    expect(screen.getByText("Similar")).toBeVisible();
    expect(screen.getByText("lucid")).toBeVisible();
    expect(screen.getByText("Roots")).toBeVisible();
  });
});

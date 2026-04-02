import {
  cleanup,
  fireEvent,
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

import type { SeedEnrichment } from "@gloss/shared/types";

import { SeedEnrichmentPanel } from "../src/features/seeds/SeedEnrichmentPanel";

afterEach(() => {
  cleanup();
});

const createEnrichment = (
  overrides: Partial<SeedEnrichment> & Pick<SeedEnrichment, "status">,
): SeedEnrichment => ({
  completedAt: null,
  createdAt: "2026-03-26T12:34:56.000Z",
  errorCode: null,
  failedAt: null,
  guardrailFlags: [],
  id: "enrichment_123",
  lexicalPreview: {
    definition: "clear and easy to understand",
    partOfSpeech: "adjective",
    source: "merriam-webster",
  },
  model: "fixture-seed-enrichment-v1",
  payload: null,
  promptTemplateVersion: "seed-enrichment.v1",
  provider: "fixture",
  requestedAt: "2026-03-26T12:34:57.000Z",
  schemaVersion: "seed-enrichment-payload.v1",
  startedAt: null,
  updatedAt: "2026-03-26T12:35:10.000Z",
  ...overrides,
});

describe("SeedEnrichmentPanel", () => {
  it("renders the accepted enrichment payload", () => {
    render(
      <SeedEnrichmentPanel
        enrichment={createEnrichment({
          completedAt: "2026-03-26T12:35:10.000Z",
          payload: {
            contrastiveWord: {
              note: "Opaque language hides the meaning that pellucid language makes plain.",
              word: "opaque",
            },
            gloss:
              "In this sentence, it means the explanation was strikingly clear and easy to follow.",
            morphologyNote: {
              note: "The root is associated with brightness or clarity.",
            },
            registerNote:
              "It is more formal and literary than everyday words like clear.",
            relatedWord: {
              note: "Both words praise clarity, though pellucid sounds more elevated.",
              word: "lucid",
            },
          },
          status: "ready",
        })}
        errorMessage={null}
        isEnriching={false}
        isRefreshing={false}
        onRefresh={vi.fn()}
        onRetry={vi.fn()}
        primarySentence="Her explanation was pellucid even under pressure."
        showManualRefresh={false}
        word="pellucid"
      />,
    );

    expect(
      screen.getByText("clear and easy to understand"),
    ).toBeVisible();
    expect(screen.getByText("Definition")).toBeVisible();
    expect(screen.getByText("In your sentence")).toBeVisible();
    expect(
      screen.getByText(
        "In this sentence, it means the explanation was strikingly clear and easy to follow.",
      ),
    ).toBeVisible();
  });

  it("surfaces the failed state and retry affordance for retriable failures", () => {
    const onRetry = vi.fn();

    render(
      <SeedEnrichmentPanel
        enrichment={createEnrichment({
          errorCode: "ENRICHMENT_PROVIDER_ERROR",
          failedAt: "2026-03-26T12:35:10.000Z",
          payload: null,
          status: "failed",
        })}
        errorMessage={null}
        isEnriching={false}
        isRefreshing={false}
        onRefresh={vi.fn()}
        onRetry={onRetry}
        primarySentence="Her explanation was pellucid even under pressure."
        showManualRefresh={false}
        word="pellucid"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(
      screen.getByText(/provider did not return a usable result/i),
    ).toBeVisible();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("treats request failures without enrichment as failed, not pending", () => {
    const onRetry = vi.fn();

    render(
      <SeedEnrichmentPanel
        enrichment={null}
        errorMessage="Unable to enrich this seed right now."
        isEnriching={false}
        isRefreshing={false}
        onRefresh={vi.fn()}
        onRetry={onRetry}
        primarySentence={null}
        showManualRefresh={false}
        word="pellucid"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(
      screen.getByText("Unable to enrich this seed right now."),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Refresh now" })).toBeNull();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("keeps weak-evidence failures visibly passive", () => {
    render(
      <SeedEnrichmentPanel
        enrichment={createEnrichment({
          errorCode: "ENRICHMENT_EVIDENCE_UNAVAILABLE",
          failedAt: "2026-03-26T12:35:10.000Z",
          lexicalPreview: null,
          payload: null,
          status: "failed",
        })}
        errorMessage={null}
        isEnriching={false}
        isRefreshing={false}
        onRefresh={vi.fn()}
        onRetry={vi.fn()}
        primarySentence={null}
        showManualRefresh={false}
        word="pellucid"
      />,
    );

    expect(screen.getByText(/still needs the sentence where you saw it/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("keeps pending enrichment automatic by default", () => {
    render(
      <SeedEnrichmentPanel
        enrichment={createEnrichment({
          lexicalPreview: null,
          payload: null,
          startedAt: "2026-03-26T12:34:58.000Z",
          status: "pending",
          updatedAt: "2026-03-26T12:34:58.000Z",
        })}
        errorMessage={null}
        isEnriching={false}
        isRefreshing={false}
        onRefresh={vi.fn()}
        onRetry={vi.fn()}
        primarySentence="Her explanation was pellucid even under pressure."
        showManualRefresh={false}
        word="pellucid"
      />,
    );

    expect(
      screen.getByText(/Gloss is grounding pellucid in Merriam-Webster first/i),
    ).toBeVisible();
    expect(
      screen.getByText(/You do not need to wait here\./i),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Refresh now" })).toBeNull();
  });

  it("surfaces a quiet refresh fallback while enrichment is pending", () => {
    const onRefresh = vi.fn();

    render(
      <SeedEnrichmentPanel
        enrichment={createEnrichment({
          payload: null,
          startedAt: "2026-03-26T12:34:58.000Z",
          status: "pending",
          updatedAt: "2026-03-26T12:34:58.000Z",
        })}
        errorMessage={null}
        isEnriching={false}
        isRefreshing={false}
        onRefresh={onRefresh}
        onRetry={vi.fn()}
        primarySentence="Her explanation was pellucid even under pressure."
        showManualRefresh={true}
        word="pellucid"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Check again" }));

    expect(
      screen.getByText(/The dictionary meaning is here\./i),
    ).toBeVisible();
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("surfaces pending refresh errors with a refresh action instead of a retry mutation", () => {
    const onRefresh = vi.fn();

    render(
      <SeedEnrichmentPanel
        enrichment={createEnrichment({
          payload: null,
          startedAt: "2026-03-26T12:34:58.000Z",
          status: "pending",
          updatedAt: "2026-03-26T12:34:58.000Z",
        })}
        errorMessage="Unable to refresh this seed right now."
        isEnriching={false}
        isRefreshing={false}
        onRefresh={onRefresh}
        onRetry={vi.fn()}
        primarySentence="Her explanation was pellucid even under pressure."
        showManualRefresh={true}
        word="pellucid"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Check again" }));

    expect(screen.getByText("Unable to refresh this seed right now.")).toBeVisible();
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});

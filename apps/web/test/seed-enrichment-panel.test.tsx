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

import { SeedEnrichmentPanel } from "../src/features/seeds/SeedEnrichmentPanel";

afterEach(() => {
  cleanup();
});

describe("SeedEnrichmentPanel", () => {
  it("renders the accepted enrichment payload", () => {
    render(
      <SeedEnrichmentPanel
        enrichment={{
          completedAt: "2026-03-26T12:35:10.000Z",
          createdAt: "2026-03-26T12:34:56.000Z",
          errorCode: null,
          failedAt: null,
          guardrailFlags: [],
          id: "enrichment_123",
          model: "fixture-seed-enrichment-v1",
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
          promptTemplateVersion: "seed-enrichment.v1",
          provider: "fixture",
          requestedAt: "2026-03-26T12:34:57.000Z",
          schemaVersion: "seed-enrichment-payload.v1",
          startedAt: null,
          status: "ready",
          updatedAt: "2026-03-26T12:35:10.000Z",
        }}
        errorMessage={null}
        isEnriching={false}
        onRetry={vi.fn()}
      />,
    );

    expect(
      screen.getByText("The explanation was strikingly clear and easy to follow."),
    ).toBeVisible();
    expect(screen.getByText("Definition")).toBeVisible();
    expect(screen.getByText("In context")).toBeVisible();
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
        enrichment={{
          completedAt: null,
          createdAt: "2026-03-26T12:34:56.000Z",
          errorCode: "ENRICHMENT_PROVIDER_ERROR",
          failedAt: "2026-03-26T12:35:10.000Z",
          guardrailFlags: [],
          id: "enrichment_124",
          model: "fixture-seed-enrichment-v1",
          payload: null,
          promptTemplateVersion: "seed-enrichment.v1",
          provider: "fixture",
          requestedAt: "2026-03-26T12:34:57.000Z",
          schemaVersion: "seed-enrichment-payload.v1",
          startedAt: null,
          status: "failed",
          updatedAt: "2026-03-26T12:35:10.000Z",
        }}
        errorMessage={null}
        isEnriching={false}
        onRetry={onRetry}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(
      screen.getByText(/provider did not return a usable result/i),
    ).toBeVisible();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("keeps weak-evidence failures visibly passive", () => {
    render(
      <SeedEnrichmentPanel
        enrichment={{
          completedAt: null,
          createdAt: "2026-03-26T12:34:56.000Z",
          errorCode: "ENRICHMENT_EVIDENCE_UNAVAILABLE",
          failedAt: "2026-03-26T12:35:10.000Z",
          guardrailFlags: [],
          id: "enrichment_126",
          model: "fixture-seed-enrichment-v1",
          payload: null,
          promptTemplateVersion: "seed-enrichment.v1",
          provider: "fixture",
          requestedAt: "2026-03-26T12:34:57.000Z",
          schemaVersion: "seed-enrichment-payload.v1",
          startedAt: null,
          status: "failed",
          updatedAt: "2026-03-26T12:35:10.000Z",
        }}
        errorMessage={null}
        isEnriching={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText(/not enough context yet/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("surfaces a refresh affordance while enrichment is pending", () => {
    const onRetry = vi.fn();

    render(
      <SeedEnrichmentPanel
        enrichment={{
          completedAt: null,
          createdAt: "2026-03-26T12:34:56.000Z",
          errorCode: null,
          failedAt: null,
          guardrailFlags: [],
          id: "enrichment_125",
          model: "fixture-seed-enrichment-v1",
          payload: null,
          promptTemplateVersion: "seed-enrichment.v1",
          provider: "fixture",
          requestedAt: "2026-03-26T12:34:57.000Z",
          schemaVersion: "seed-enrichment-payload.v1",
          startedAt: "2026-03-26T12:34:58.000Z",
          status: "pending",
          updatedAt: "2026-03-26T12:34:58.000Z",
        }}
        errorMessage={null}
        isEnriching={false}
        onRetry={onRetry}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(screen.getByText(/building a definition/i)).toBeVisible();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

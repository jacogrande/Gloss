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

import type { SeedDetail } from "@gloss/shared/types";

import { SeedContextEditor } from "../src/features/seeds/SeedContextEditor";

const createSeed = (
  overrides?: Partial<SeedDetail>,
): SeedDetail => ({
  contexts: [],
  createdAt: "2026-03-26T00:00:00.000Z",
  enrichment: null,
  id: "seed_1",
  primarySentence: null,
  source: null,
  stage: "new",
  updatedAt: "2026-03-26T00:00:00.000Z",
  word: "pellucid",
  ...overrides,
});

describe("SeedContextEditor", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
  });

  it("restores unsaved drafts after the editor remounts", async () => {
    const onSubmit = vi.fn();
    const seed = createSeed();

    const initialRender = render(
      <SeedContextEditor
        errorMessage={null}
        helperMessage="Add context."
        isPending={false}
        onSubmit={onSubmit}
        seed={seed}
        statusMessage={null}
        title="Add context"
      />,
    );

    await userEvent.type(
      screen.getByRole("textbox", { name: "Sentence (optional)" }),
      "Her reply was pellucid even under pressure.",
    );

    initialRender.unmount();

    render(
      <SeedContextEditor
        errorMessage={null}
        helperMessage="Add context."
        isPending={false}
        onSubmit={onSubmit}
        seed={seed}
        statusMessage={null}
        title="Add context"
      />,
    );

    expect(
      screen.getByRole("textbox", { name: "Sentence (optional)" }),
    ).toHaveValue("Her reply was pellucid even under pressure.");
  });
});

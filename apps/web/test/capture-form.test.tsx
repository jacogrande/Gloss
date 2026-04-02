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

import { CaptureForm } from "../src/features/seeds/CaptureForm";

describe("CaptureForm", () => {
  afterEach(() => {
    cleanup();
  });

  it("serializes optional source metadata before submit", () => {
    const onSubmit = vi.fn();

    render(
      <CaptureForm
        errorMessage={null}
        isPending={false}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Word or phrase"), {
      target: { value: "lapidary" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add sentence or source" }));
    fireEvent.change(screen.getByLabelText("Sentence from your reading (recommended)"), {
      target: {
        value: "The prose became unexpectedly lapidary by the final chapter.",
      },
    });
    fireEvent.change(screen.getByLabelText("Source type"), {
      target: { value: "book" },
    });
    fireEvent.change(screen.getByLabelText("Source title"), {
      target: { value: "Collected Essays" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Save word" }));

    expect(onSubmit).toHaveBeenCalledWith({
      sentence: "The prose became unexpectedly lapidary by the final chapter.",
      source: {
        author: undefined,
        kind: "book",
        title: "Collected Essays",
        url: undefined,
      },
      word: "lapidary",
    });
  });

  it("explains the save-to-review loop on the capture screen", () => {
    render(
      <CaptureForm
        errorMessage={null}
        isPending={false}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        /Save the word first\. Add the sentence where you found it for the strongest definition\./i,
      ),
    ).toBeVisible();
    expect(
      screen.getByText(/Merriam-Webster lands first\./i),
    ).toBeVisible();
  });

  it("keeps context fields hidden until requested", () => {
    render(
      <CaptureForm
        errorMessage={null}
        isPending={false}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText("Sentence from your reading (recommended)")).toBeNull();
    expect(screen.getByRole("button", { name: "Add sentence or source" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Add sentence or source" }));

    expect(screen.getByLabelText("Sentence from your reading (recommended)")).toBeVisible();
    expect(
      screen.getByText(/Best results come from the sentence where you found the word\./i),
    ).toBeVisible();
  });

  it("reopens hidden context when a submit error needs those fields", () => {
    const view = render(
      <CaptureForm
        errorMessage={null}
        isPending={false}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add sentence or source" }));
    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "not-a-url" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Hide context" }));

    expect(screen.queryByLabelText("URL")).toBeNull();

    view.rerender(
      <CaptureForm
        errorMessage="Enter a valid URL."
        isPending={false}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("URL")).toBeVisible();
  });
});

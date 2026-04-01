import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CaptureForm } from "../src/features/seeds/CaptureForm";

describe("CaptureForm", () => {
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
    fireEvent.change(screen.getByLabelText("Sentence (optional)"), {
      target: {
        value: "The prose became unexpectedly lapidary by the final chapter.",
      },
    });
    fireEvent.click(screen.getByText("Source details (optional)"));
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
});

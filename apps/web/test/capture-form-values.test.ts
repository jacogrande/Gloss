import { describe, expect, it } from "vitest";

import { toCreateSeedInput } from "../src/features/seeds/capture-form-values";

describe("toCreateSeedInput", () => {
  it("omits empty optional fields", () => {
    expect(
      toCreateSeedInput({
        sentence: "",
        sourceAuthor: "",
        sourceKind: "article",
        sourceTitle: "",
        sourceUrl: "",
        word: "lapidary",
      }),
    ).toEqual({
      sentence: undefined,
      source: undefined,
      word: "lapidary",
    });
  });

  it("includes source metadata when provided", () => {
    expect(
      toCreateSeedInput({
        sentence: "  Dense and exact. ",
        sourceAuthor: "  A. Reader ",
        sourceKind: "book",
        sourceTitle: "  Collected Essays ",
        sourceUrl: "",
        word: " lapidary ",
      }),
    ).toEqual({
      sentence: "Dense and exact.",
      source: {
        author: "A. Reader",
        kind: "book",
        title: "Collected Essays",
        url: undefined,
      },
      word: "lapidary",
    });
  });
});

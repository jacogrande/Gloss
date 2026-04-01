import { describe, expect, it } from "vitest";

import {
  hasSeedContextChanges,
  toCreateSeedInput,
  toUpdateSeedInput,
} from "../src/features/seeds/capture-form-values";

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

  it("normalizes a context-only update payload", () => {
    expect(
      toUpdateSeedInput({
        sentence: "  Dense and exact. ",
        sourceAuthor: "",
        sourceKind: "article",
        sourceTitle: "  Collected Essays ",
        sourceUrl: "",
      }, {
        primarySentence: null,
        source: null,
      }),
    ).toEqual({
      sentence: "Dense and exact.",
      source: {
        author: undefined,
        kind: "article",
        title: "Collected Essays",
        url: undefined,
      },
    });
  });

  it("omits unchanged fields in recovery updates", () => {
    expect(
      toUpdateSeedInput({
        sentence: " Dense and exact. ",
        sourceAuthor: "A. Reader",
        sourceKind: "book",
        sourceTitle: "Collected Essays",
        sourceUrl: "",
      }, {
        primarySentence: "Dense and exact.",
        source: {
          author: "A. Reader",
          id: "source_1",
          kind: "book",
          title: "Collected Essays",
          url: null,
        },
      }),
    ).toEqual({});
  });

  it("marks fields as changed when the recovery form differs from the seed", () => {
    expect(
      hasSeedContextChanges(
        {
          sentence: "  Dense and exact. ",
          sourceAuthor: "",
          sourceKind: "article",
          sourceTitle: "",
          sourceUrl: "",
        },
        {
          primarySentence: null,
          source: null,
        },
      ),
    ).toBe(true);

    expect(
      hasSeedContextChanges(
        {
          sentence: " Dense and exact. ",
          sourceAuthor: "A. Reader",
          sourceKind: "book",
          sourceTitle: "Collected Essays",
          sourceUrl: "",
        },
        {
          primarySentence: "Dense and exact.",
          source: {
            author: "A. Reader",
            id: "source_1",
            kind: "book",
            title: "Collected Essays",
            url: null,
          },
        },
      ),
    ).toBe(false);
  });
});

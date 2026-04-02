import { describe, expect, it } from "vitest";

import {
  getAuthHelperCopy,
  getCaptureHelperCopy,
  getCaptureOutcomeCopy,
  getEmptyLibraryMessage,
  getProductLoopLine,
} from "../src/lib/product-loop-copy";

describe("product loop presenters", () => {
  it("produces consistent loop copy across first-run screens", () => {
    const sharedLine = getProductLoopLine();

    expect(getAuthHelperCopy("sign-up")).toContain(sharedLine);
    expect(getEmptyLibraryMessage()).toContain(sharedLine);
    expect(getCaptureHelperCopy()).toContain(
      "Add the sentence where you found it for the strongest definition.",
    );
  });

  it("keeps capture outcome copy focused on the user-visible result", () => {
    expect(getCaptureOutcomeCopy()).toContain("Merriam-Webster lands first");
  });
});

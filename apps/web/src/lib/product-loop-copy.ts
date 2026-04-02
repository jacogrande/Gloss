const productLoopLine =
  "Save a word. Merriam-Webster grounds it first. Gloss brings it back in review.";

export const getAuthHelperCopy = (
  mode: "sign-in" | "sign-up",
): string =>
  mode === "sign-in"
    ? `Sign in to keep saving words from real reading. ${productLoopLine}`
    : `Start with a word from real reading. ${productLoopLine}`;

export const getCaptureHelperCopy = (): string =>
  "Save the word first. Add the sentence where you found it for the strongest definition.";

export const getCaptureOutcomeCopy = (): string =>
  "Save now. Merriam-Webster lands first. Gloss then tunes the meaning to your reading and prepares review.";

export const getCaptureContextToggleLabel = (input: {
  hasContext: boolean;
  isOpen: boolean;
}): string => {
  if (input.isOpen) {
    return "Hide context";
  }

  return input.hasContext ? "Edit sentence or source" : "Add sentence or source";
};

export const getCaptureContextHelperCopy = (): string =>
  "Best results come from the sentence where you found the word. Source details help when the sentence is thin.";

export const getEmptyLibraryMessage = (): string =>
  `Save your first word from real reading. ${productLoopLine}`;

export const getProductLoopLine = (): string => productLoopLine;

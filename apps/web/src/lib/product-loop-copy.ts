const productLoopLine =
  "Save a word. Merriam-Webster grounds it first. Gloss brings it back in review.";

export const getAuthHelperCopy = (
  mode: "sign-in" | "sign-up",
): string =>
  mode === "sign-in"
    ? `Sign in to keep saving words from real reading. ${productLoopLine}`
    : `Start with a word from real reading. ${productLoopLine}`;

export const getCaptureHelperCopy = (): string =>
  "Save the word first. Add the sentence where you found it for the sharpest definition.";

export const getCaptureOutcomeCopy = (): string =>
  "Merriam-Webster lands first. Gloss then shapes the final pass and review cues.";

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
  "The sentence does most of the work. Source details help when the sentence is thin.";

export const getEmptyLibraryMessage = (): string =>
  `Save your first word from real reading. ${productLoopLine}`;

export const getProductLoopLine = (): string => productLoopLine;

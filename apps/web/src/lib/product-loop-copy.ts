const productLoopLine =
  "Gloss builds the definition first. When a word is ready, it enters review.";

export const getAuthHelperCopy = (
  mode: "sign-in" | "sign-up",
): string =>
  mode === "sign-in"
    ? `Sign in to keep saving words from real reading. ${productLoopLine}`
    : `Save words from real reading. ${productLoopLine}`;

export const getCaptureHelperCopy = (): string =>
  `Word first. Add context only if it helps. ${productLoopLine}`;

export const getCaptureOutcomeCopy = (): string =>
  "Save now. Gloss builds the meaning first. When this word is ready, it enters review.";

export const getCaptureContextToggleLabel = (input: {
  hasContext: boolean;
  isOpen: boolean;
}): string => {
  if (input.isOpen) {
    return "Hide context";
  }

  return input.hasContext ? "Edit context" : "Add context";
};

export const getCaptureContextHelperCopy = (): string =>
  "A sentence or source helps when the meaning is thin.";

export const getEmptyLibraryMessage = (): string =>
  `Save your first word from real reading. ${productLoopLine}`;

export const getProductLoopLine = (): string => productLoopLine;

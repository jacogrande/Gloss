const contextualGlossPatterns = [
  /^in this (?:sentence|context|passage|usage),?\s*(?:it\s+)?means\s+/iu,
  /^in this kind of (?:sentence|context|passage|usage),?\s*(?:it\s+)?(?:means|describes|refers to)\s+/iu,
  /^in this case,?\s*(?:it\s+)?means\s+/iu,
  /^here,?\s*(?:it\s+)?means\s+/iu,
  /^here,?\s*/iu,
  /^in context,?\s*(?:it\s+)?means\s+/iu,
  /^used here,?\s*(?:it\s+)?means\s+/iu,
];

const capitalizeFirstLetter = (value: string): string =>
  value.length === 0 ? value : `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;

export const toDictionaryDefinition = (value: string): string => {
  const trimmedValue = value.trim();

  for (const pattern of contextualGlossPatterns) {
    if (!pattern.test(trimmedValue)) {
      continue;
    }

    return capitalizeFirstLetter(trimmedValue.replace(pattern, "").trim());
  }

  return trimmedValue;
};

export const shouldShowContextualGloss = (
  dictionaryDefinition: string,
  contextualGloss: string,
): boolean => dictionaryDefinition.trim() !== contextualGloss.trim();
